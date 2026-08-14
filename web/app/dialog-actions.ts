"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { apiClient, ApiError } from "@/lib/api-client";
import { getSignedInState } from "@/server/auth-redirect";

async function api() {
  return apiClient({ cookie: (await cookies()).toString() });
}

function errMsg(e: unknown): string {
  if (e instanceof ZodError) return e.issues?.[0]?.message ?? "Invalid input.";
  if (e instanceof ApiError) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong. Please try again.";
}

async function wsPath(role: "admin" | "traveler", path = "") {
  const state = await getSignedInState(await headers());
  if (!state) return "/";
  return `/${state.workspaceSlug}/${role}${path}`;
}

export type DialogState = { success?: boolean; error?: string } | null;

export async function createTripDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const input = z.object({
      teamId: z.string().min(1),
      name: z.string().min(2),
      destination: z.string().min(2),
      budget: z.coerce.number().positive(),
      currency: z.string().min(3).max(5),
      startDate: z.string().date(),
      endDate: z.string().date(),
      status: z.enum(["draft", "active", "completed", "archived"]).default("active"),
    }).parse(Object.fromEntries(formData.entries()));
    const travelerUserIds = formData.getAll("travelerUserIds").map(String).filter(Boolean);
    await (await api()).trips.create({ ...input, travelerUserIds });
    revalidatePath(await wsPath("admin"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function createExpenseDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  const state = await getSignedInState(await headers());
  if (!state) return { error: "Session expired. Please sign in again." };
  try {
    const input = z.object({
      merchant: z.string().min(2),
      amount: z.coerce.number().positive(),
      currency: z.string().min(3).max(5),
      category: z.string().min(2),
      date: z.string().date(),
      notes: z.string().optional(),
      tripId: z.string().optional(),
      paymentMethod: z.enum(["cash", "personal_card", "company_card", "bank_transfer", "other"]).optional(),
      status: z.enum(["draft", "submitted"]).default("draft"),
    }).parse(Object.fromEntries(formData.entries()));
    const receipt = formData.get("receipt");
    const client = await api();
    const uploadedReceipt =
      receipt instanceof File && receipt.size > 0
        ? await client.storage.upload(receipt, "receipts")
        : null;

    const expense = await client.expenses.create({
      merchant: input.merchant,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      expenseDate: input.date,
      notes: input.notes,
      tripId: input.tripId || undefined,
      paymentMethod: input.paymentMethod || undefined,
      receiptFileUrl: uploadedReceipt?.url,
    });
    if (input.status === "submitted") {
      await client.expenses.submit(expense.id);
    }
    revalidatePath(await wsPath("traveler", "/expenses"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function addExpenseCommentAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const expenseId = String(formData.get("expenseId") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!expenseId || !body) return { error: "Comment cannot be empty." };
    await (await api()).comments.create(expenseId, body);
    const tripId = String(formData.get("tripId") ?? "").trim();
    if (tripId) revalidatePath(await wsPath("admin", `/trips/${tripId}`));
    else revalidatePath(await wsPath("admin"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function inviteMemberDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const state = await getSignedInState(await headers());
    if (!state) return { error: "Session expired. Please sign in again." };
    const input = z.object({
      email: z.string().email(),
      role: z.enum(["admin", "traveler"]).default("traveler"),
    }).parse(Object.fromEntries(formData.entries()));
    await (await api()).organizations.inviteMember(state.organizationId, input.email, input.role);
    revalidatePath(await wsPath("admin", "/settings"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function createTeamDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const state = await getSignedInState(await headers());
    if (!state) return { error: "Session expired. Please sign in again." };
    const input = z.object({ name: z.string().min(2).max(80) }).parse(Object.fromEntries(formData.entries()));
    await (await api()).organizations.createTeam(state.organizationId, input.name);
    revalidatePath(await wsPath("admin", "/settings"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function addToTeamDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const state = await getSignedInState(await headers());
    if (!state) return { error: "Session expired. Please sign in again." };
    const input = z.object({
      teamId: z.string().min(1),
      userId: z.string().min(1),
    }).parse(Object.fromEntries(formData.entries()));
    await (await api()).organizations.addTeamMember(state.organizationId, input.teamId, input.userId);
    revalidatePath(await wsPath("admin", "/settings"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function assignTravelersDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const tripId = String(formData.get("tripId") ?? "");
    const travelerUserIds = formData.getAll("travelerUserIds").map(String).filter(Boolean);
    await (await api()).trips.assignTravelers(tripId, travelerUserIds);
    revalidatePath(await wsPath("admin", `/trips/${tripId}`));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function requestApprovalDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const tripId = String(formData.get("tripId") ?? "");
    const purpose = String(formData.get("purpose") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    await (await api()).trips.requestApproval(tripId, { purpose: purpose || undefined, notes: notes || undefined });
    revalidatePath(await wsPath("traveler", `/trips/${tripId}`));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function reviewApprovalDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const id = String(formData.get("id") ?? "");
    const status = z.enum(["approved", "rejected"]).parse(String(formData.get("status") ?? ""));
    await (await api()).trips.reviewApproval(id, status);
    revalidatePath(await wsPath("admin"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function bulkApproveApprovalsAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const ids = formData.getAll("ids").map(String).filter(Boolean);
    const status = z.enum(["approved", "rejected"]).parse(String(formData.get("status") ?? ""));
    const client = await api();
    await Promise.all(ids.map((id) => client.trips.reviewApproval(id, status)));
    revalidatePath(await wsPath("admin"));
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function submitExpenseAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const id = String(formData.get("id") ?? "");
    await (await api()).expenses.submit(id);
    const tripId = formData.get("tripId");
    const path = tripId
      ? await wsPath("traveler", `/trips/${tripId}`)
      : await wsPath("traveler", "/expenses");
    revalidatePath(path);
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}

export async function reviewExpenseDialogAction(_: DialogState, formData: FormData): Promise<DialogState> {
  try {
    const id = String(formData.get("id") ?? "");
    const status = z.enum(["approved", "rejected", "reimbursed"]).parse(String(formData.get("status") ?? ""));
    await (await api()).expenses.review(id, status);
    const tripId = formData.get("tripId");
    const path = tripId ? await wsPath("admin", `/trips/${tripId}`) : await wsPath("admin");
    revalidatePath(path);
    return { success: true };
  } catch (e) { return { error: errMsg(e) }; }
}
