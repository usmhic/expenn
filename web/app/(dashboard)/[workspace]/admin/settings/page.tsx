import Link from "next/link";
import {
  AlertTriangle, Check, CreditCard, Mail, Shield, Users, Zap,
} from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { AddToTeamDialog, CreateTeamDialog, InviteMemberDialog } from "@/components/dialogs";
import { apiClient } from "@/lib/api-client";
import { PLAN_LABELS, PRICE_PER_PAID_USER, FREE_INCLUDED_USERS, type BillingPlan } from "@/lib/billing/paddle";

const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  free: [
    "Owner + 1 user included",
    "Unlimited trips",
    "Expense tracking",
    "Document vault",
    "Receipt storage",
  ],
  pro: [
    `Owner + 1 user included free`,
    `$${PRICE_PER_PAID_USER}/mo per additional user`,
    "Unlimited trips",
    "Expense review & approvals",
    "Document vault",
    "Shared analytics",
  ],
};

function billingStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "trialing") return "Trial";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  if (status === "free") return "Free plan";
  return status;
}

export default async function AdminSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ workspace }, { error }] = await Promise.all([params, searchParams]);
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";
  const isManager = role === "manager";
  const orgId = currentUser.activeOrganizationId || workspace;

  const [teams, members, invitations] = await Promise.all([
    api.organizations.getTeams(orgId),
    api.organizations.getMembers(orgId),
    isManager
      ? Promise.resolve([] as Awaited<ReturnType<typeof api.organizations.getInvitations>>)
      : api.organizations.getInvitations(orgId),
  ]);

  const isOwner = currentUser.organizationRole === "owner";
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  // Billing fields come from the .NET API's OrgDto (Organization is authoritative there now).
  let billing: {
    plan: BillingPlan;
    billingStatus: string;
    paidSeats: number;
    paddleCustomerId: string | null;
    paddleSubscriptionId: string | null;
    currentPeriodEndsAt: Date | null;
  } | null = null;

  const org = await api.organizations.getBySlug(workspace).catch(() => null);
  if (org) {
    billing = {
      plan: (org.plan as BillingPlan) ?? "free",
      billingStatus: org.billingStatus ?? "free",
      paidSeats: org.paidSeats ?? 0,
      paddleCustomerId: org.paddleCustomerId ?? null,
      paddleSubscriptionId: org.paddleSubscriptionId ?? null,
      currentPeriodEndsAt: org.currentPeriodEndsAt ? new Date(org.currentPeriodEndsAt) : null,
    };
  }

  const plan = billing?.plan ?? "free";
  const billingStatus = billing?.billingStatus ?? "free";
  const paidSeats = billing?.paidSeats ?? 0;
  const isPaid = ["active", "trialing"].includes(billingStatus);
  const maxMembers = FREE_INCLUDED_USERS + paidSeats;
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Settings" }]}>
      <section className="w-full space-y-5">
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {decodeURIComponent(error)}
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isManager
              ? `Members and teams for this workspace.`
              : `Members, teams, and subscription for this workspace.`}
          </p>
        </div>

        {/* ── Members ── */}
        <article className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="size-3.5" />
              </span>
              <h2 className="text-base font-semibold">Members</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isManager
                  ? `${members.length} member${members.length === 1 ? "" : "s"}`
                  : `${members.length} / ${isPaid ? maxMembers : FREE_INCLUDED_USERS} member${members.length === 1 ? "" : "s"}`}
              </span>
              {isOwner && <InviteMemberDialog />}
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-[0.75rem] font-bold text-primary-foreground shadow-elegant">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                </span>
                <span className="capitalize text-xs text-muted-foreground rounded-full border border-border px-2 py-0.5">{m.role}</span>
              </div>
            ))}
          </div>

          {pendingInvitations.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Pending invitations</p>
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-1.5">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground truncate">{inv.email}</span>
                  <StatusBadge value={inv.status} />
                  <span className="text-xs capitalize text-muted-foreground">{inv.role}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* ── Teams ── */}
        <article className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Shield className="size-3.5" />
              </span>
              <h2 className="text-base font-semibold">Teams</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{teams.length} team{teams.length === 1 ? "" : "s"}</span>
              {isOwner && (
                <>
                  <AddToTeamDialog members={members} teams={teams} />
                  <CreateTeamDialog />
                </>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-secondary/35 p-3">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Team created {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-3">No teams yet. Create one to organize your travelers.</p>
            )}
          </div>
        </article>

        {/* ── Subscription / Billing ── */}
        {!isManager && <article className="card" id="billing">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CreditCard className="size-3.5" />
            </span>
            <h2 className="text-base font-semibold">Subscription</h2>
          </div>

          {/* Current plan banner */}
          <div className={`rounded-xl border p-4 mb-4 ${isPaid ? "border-teal-200 bg-teal-50/60 dark:border-teal-400/20 dark:bg-teal-400/8" : "border-border bg-secondary/40"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`flex size-10 items-center justify-center rounded-xl shadow-elegant ${isPaid ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <Zap className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{PLAN_LABELS[plan]} plan</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {billingStatusLabel(billingStatus)}
                    {isPaid && (
                      <> · {paidSeats} paid seat{paidSeats === 1 ? "" : "s"} · {members.length}/{maxMembers} members</>
                    )}
                    {billing?.currentPeriodEndsAt && (
                      <> · Renews {billing.currentPeriodEndsAt.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</>
                    )}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                billingStatus === "active" ? "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300" :
                billingStatus === "trialing" ? "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" :
                billingStatus === "past_due" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" :
                "bg-secondary text-muted-foreground"
              }`}>
                {billingStatusLabel(billingStatus)}
              </span>
            </div>

            {/* Plan features */}
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="size-3 shrink-0 text-teal-600 dark:text-teal-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Alerts */}
          {billingStatus === "past_due" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Payment past due — update your payment method to keep your workspace active.</span>
            </div>
          )}

          {billingStatus === "canceled" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>Subscription canceled. Re-subscribe to add more members.</span>
            </div>
          )}

          {/* Billing details */}
          {(billing?.paddleSubscriptionId || billing?.paddleCustomerId) && (
            <div className="mb-4 grid gap-1.5 rounded-lg bg-secondary/50 p-3 text-xs">
              {billing.paddleSubscriptionId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Subscription ID</span>
                  <code className="font-mono text-foreground">{billing.paddleSubscriptionId.slice(0, 20)}…</code>
                </div>
              )}
              {billing.paddleCustomerId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Customer ID</span>
                  <code className="font-mono text-foreground">{billing.paddleCustomerId.slice(0, 20)}…</code>
                </div>
              )}
              {isPaid && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Monthly total</span>
                  <span className="font-semibold text-foreground">${paidSeats * PRICE_PER_PAID_USER}/mo</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              {!isPaid && (
                <Link href="/checkout?seats=1" className="primary-button rounded-lg text-sm">
                  Subscribe — ${PRICE_PER_PAID_USER}/mo per user
                </Link>
              )}
              {isPaid && billing?.paddleSubscriptionId && (
                <a
                  href={`https://customer.paddle.com/subscriptions/${billing.paddleSubscriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-button rounded-lg text-sm"
                >
                  Manage subscription in Paddle
                </a>
              )}
            </div>
          )}

          {!isOwner && (
            <p className="text-xs text-muted-foreground">Only workspace owners can manage the subscription.</p>
          )}
        </article>}
      </section>
    </AppShell>
  );
}
