import Link from "next/link";
import { AlertTriangle, Check, CreditCard, UserRound, Zap } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { apiClient } from "@/lib/api-client";
import { PLAN_LABELS, PRICE_PER_PAID_USER, type BillingPlan } from "@/lib/billing/paddle";

function billingStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "trialing") return "Trial";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  if (status === "free") return "Free plan";
  return status;
}

export default async function TravelerAccountPage() {
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();

  let billing: {
    plan: BillingPlan;
    billingStatus: string;
    paidSeats: number;
    paddleSubscriptionId: string | null;
    currentPeriodEndsAt: Date | null;
  } | null = null;

  const org = currentUser.activeOrganizationSlug
    ? await api.organizations.getBySlug(currentUser.activeOrganizationSlug).catch(() => null)
    : null;
  if (org) {
    billing = {
      plan: (org.plan as BillingPlan) ?? "free",
      billingStatus: org.billingStatus ?? "free",
      paidSeats: org.paidSeats ?? 0,
      paddleSubscriptionId: org.paddleSubscriptionId ?? null,
      currentPeriodEndsAt: org.currentPeriodEndsAt ? new Date(org.currentPeriodEndsAt) : null,
    };
  }

  const plan = billing?.plan ?? "free";
  const billingStatus = billing?.billingStatus ?? "free";
  const isPaid = ["active", "trialing"].includes(billingStatus);
  const initials = currentUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Account" }]}>
      <section className="w-full max-w-xl space-y-5">
        <div>
          <h1 className="text-xl font-bold">Account</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Your profile and subscription.</p>
        </div>

        {/* ── Profile ── */}
        <article className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserRound className="size-3.5" />
            </span>
            <h2 className="text-base font-semibold">Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-elegant">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{currentUser.name}</p>
              <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground rounded-full border border-border inline-block px-2 py-0.5">
                {currentUser.organizationRole}
              </p>
            </div>
          </div>
        </article>

        {/* ── Subscription ── */}
        <article className="card" id="billing">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CreditCard className="size-3.5" />
              </span>
              <h2 className="text-base font-semibold">Subscription</h2>
            </div>

            <div className={`rounded-xl border p-4 mb-4 ${isPaid ? "border-teal-200 bg-teal-50/60 dark:border-teal-400/20 dark:bg-teal-400/8" : "border-border bg-secondary/40"}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`flex size-10 items-center justify-center rounded-xl shadow-elegant ${isPaid ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <Zap className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{PLAN_LABELS[plan]} plan</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {billingStatusLabel(billingStatus)}
                    {billing?.currentPeriodEndsAt && (
                      <> · Renews {billing.currentPeriodEndsAt.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</>
                    )}
                  </p>
                </div>
                <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  billingStatus === "active" ? "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300" :
                  billingStatus === "trialing" ? "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" :
                  billingStatus === "past_due" ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {billingStatusLabel(billingStatus)}
                </span>
              </div>

              <ul className="grid gap-1">
                {(isPaid
                  ? ["Unlimited trips", "Expense tracking & approvals", "Document vault", "Receipt storage"]
                  : ["Unlimited trips", "Expense tracking", "Document vault", "Receipt storage"]
                ).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="size-3 shrink-0 text-teal-600 dark:text-teal-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {billingStatus === "past_due" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>Payment past due — update your payment method to keep your account active.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!isPaid && (
                <Link href="/checkout?seats=1" className="primary-button rounded-lg text-sm">
                  Upgrade — ${PRICE_PER_PAID_USER}/month
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
          </article>
      </section>
    </AppShell>
  );
}
