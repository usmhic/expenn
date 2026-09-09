"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { apiClient, ApiError, type AuthResponse } from "@/lib/api-client";
import { getSignedInRedirect, getSignedInState } from "@/server/auth-redirect";
import { roleHome } from "@/server/workspace";

const expenseSchema = z.object({
  merchant: z.string().min(2),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(5),
  category: z.string().min(2),
  date: z.string().date(),
  notes: z.string().optional(),
  tripId: z.string().optional(),
  receiptFileUrl: z.string().url().optional(),
});

const documentSchema = z.object({
  title: z.string().min(1).max(255),
  kind: z.enum([
    "passport", "visa", "id_card", "drivers_license",
    "itinerary", "receipt", "invoice", "contract", "other",
  ]).default("other"),
  issuer: z.string().max(255).optional(),
  holderName: z.string().max(255).optional(),
  documentNumber: z.string().max(255).optional(),
  expiryDate: z.string().optional(),
  isSensitive: z.coerce.boolean().default(false),
});

const workspaceSetupSchema = z.object({
  name: z.string().min(2).max(120),
});

async function api() {
  return apiClient({ cookie: (await cookies()).toString() });
}

function actionError(error: unknown): string {
  if (error instanceof ZodError) return error.issues?.[0]?.message ?? "Invalid input.";
  if (error instanceof ApiError) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: string }).message);
  return "Something went wrong. Please try again.";
}

async function currentWorkspacePath(role: "admin" | "traveler", path = "") {
  const state = await getSignedInState(await headers());
  if (!state) redirect("/login?error=session-required");
  return `/${state.workspaceSlug}/${role}${path}`;
}

/** Persist a freshly issued JWT (switch-org / accept-invitation / new workspace) as the session cookie. */
async function setAuthCookie(auth: AuthResponse) {
  (await cookies()).set("expenn.token", auth.accessToken, {
    path: "/",
    expires: new Date(auth.expiresAt),
    sameSite: "lax",
  });
}

export async function getPostLoginRedirectAction() {
  const redirectTo = await getSignedInRedirect(await headers());
  // Always return /onboarding as fallback — user is authenticated, they just need a workspace.
  return { redirectTo: redirectTo ?? "/onboarding" };
}

export async function getLandingAccountStateAction() {
  const state = await getSignedInState(await headers());
  if (!state) {
    const fallback = await getSignedInRedirect(await headers());
    return fallback
      ? { signedIn: true as const, redirectTo: fallback, workspaceName: "Workspace setup" }
      : { signedIn: false as const };
  }

  return {
    signedIn: true as const,
    redirectTo: state.redirectTo,
    workspaceName: state.workspaceName,
  };
}

export async function createPersonalWorkspaceAction() {
  const client = await api();
  try {
    await client.auth.me();
  } catch {
    redirect("/login?error=session-required");
  }

  const org = await client.organizations.create({
    name: "My Workspace",
    accountType: "personal",
    creatorRole: "traveler",
  });
  await setAuthCookie(await client.auth.switchOrg(org.id));

  redirect(roleHome("traveler", org.slug));
}

export async function createWorkspaceAction(formData: FormData) {
  const input = workspaceSetupSchema.parse(Object.fromEntries(formData.entries()));
  const client = await api();
  try {
    await client.auth.me();
  } catch {
    redirect("/login?error=session-required");
  }

  const org = await client.organizations.create({ name: input.name, accountType: "company" });
  await setAuthCookie(await client.auth.switchOrg(org.id));

  redirect(roleHome("owner", org.slug));
}

export async function acceptInvitationAction(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const client = await api();

  try {
    await client.auth.me();
  } catch {
    redirect(`/login?next=/register?invite=${encodeURIComponent(invitationId)}`);
  }

  let authRes: AuthResponse;
  try {
    authRes = await client.organizations.acceptInvitation(organizationId, invitationId);
  } catch (e) {
    const msg = e instanceof ApiError ? e.message.toLowerCase() : "";
    if (msg.includes("email")) redirect("/onboarding?error=invite-email-mismatch");
    redirect("/onboarding?error=invite-expired");
  }

  await setAuthCookie(authRes);
  const me = await apiClient({ token: authRes.accessToken }).auth.me();
  redirect(roleHome(me.organizationRole ?? "traveler", me.activeOrganizationSlug ?? ""));
}

export async function switchOrgAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const role = String(formData.get("role") ?? "traveler");
  if (!organizationId || !slug) redirect("/onboarding");
  try {
    await setAuthCookie(await (await api()).auth.switchOrg(organizationId));
  } catch {
    redirect("/onboarding");
  }
  redirect(["owner", "admin", "manager"].includes(role) ? `/${slug}/admin` : `/${slug}/traveler`);
}

export async function createExpenseAction(formData: FormData) {
  const state = await getSignedInState(await headers());
  if (!state) redirect("/login?error=session-required");
  let errMsg: string | null = null;
  try {
    const input = expenseSchema.parse(Object.fromEntries(formData.entries()));
    const receipt = formData.get("receipt");
    const client = await api();
    const uploadedReceipt =
      receipt instanceof File && receipt.size > 0
        ? await client.storage.upload(receipt, "receipts")
        : null;
    await client.expenses.create({
      merchant: input.merchant,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      expenseDate: input.date,
      notes: input.notes,
      tripId: input.tripId || undefined,
      receiptFileUrl: uploadedReceipt?.url ?? input.receiptFileUrl,
    });
  } catch (e) {
    errMsg = actionError(e);
  }
  const expensesPath = await currentWorkspacePath("traveler", "/expenses");
  if (errMsg) redirect(`${expensesPath}?error=${encodeURIComponent(errMsg)}`);
  revalidatePath(expensesPath);
  redirect(`${expensesPath}?created=1`);
}

export async function createDocumentAction(formData: FormData) {
  const state = await getSignedInState(await headers());
  if (!state) redirect("/login?error=session-required");
  let errMsg: string | null = null;
  try {
    const input = documentSchema.parse(Object.fromEntries(formData.entries()));
    const file = formData.get("file");
    await (await api()).documents.create({
      title: input.title,
      kind: input.kind,
      issuer: input.issuer || undefined,
      holderName: input.holderName || undefined,
      documentNumber: input.documentNumber || undefined,
      expiryDate: input.expiryDate || undefined,
      isSensitive: input.isSensitive,
      file: file instanceof File && file.size > 0 ? file : undefined,
    });
  } catch (e) {
    errMsg = actionError(e);
  }
  const documentsPath = await currentWorkspacePath("traveler", "/documents");
  if (errMsg) redirect(`${documentsPath}?error=${encodeURIComponent(errMsg)}`);
  revalidatePath(documentsPath);
  redirect(`${documentsPath}?created=1`);
}

export async function previewReceiptExtractionAction() {
  return {
    merchant: "Demo Merchant",
    total: 42.7,
    tax: 3.2,
    date: "2026-05-09",
    currency: "USD",
    lineItems: [
      { label: "Meal", amount: 31.5 },
      { label: "Tip", amount: 11.2 },
    ],
    confidenceScore: 0.88,
    message: "AI extraction pending. Demo values loaded.",
  };
}
