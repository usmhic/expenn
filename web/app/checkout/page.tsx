import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Lock, User, Users } from "lucide-react";
import { startPaddleCheckoutAction } from "@/app/actions";
import { apiClient } from "@/lib/api-client";
import { PRICE_PER_PAID_USER } from "@/lib/billing/paddle";
import { SubmitButton } from "@/components/ui/submit-button";
import { Wordmark } from "@/components/layout/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getSignedInRedirect, getSignedInState } from "@/server/auth-redirect";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ seats?: string }>;
}) {
  const state = await getSignedInState(await headers());
  if (!state) {
    const fallback = await getSignedInRedirect(await headers());
    redirect(fallback ?? "/login?next=/checkout");
  }

  let accountType: "personal" | "company" = "company";
  try {
    const org = await apiClient({ cookie: (await cookies()).toString() }).organizations.getBySlug(state.workspaceSlug);
    if (org?.accountType) accountType = org.accountType as "personal" | "company";
  } catch {
    // fall back to "company" default
  }
  const isPersonal = accountType === "personal";

  const query = await searchParams;
  const seats = isPersonal ? 1 : Math.max(1, Number.parseInt(query.seats ?? "1", 10) || 1);
  const totalPerMonth = seats * PRICE_PER_PAID_USER;

  const isPaddleConfigured = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_PRICE_ID
  );

  const PERSONAL_FEATURES = [
    "Unlimited trips",
    "Expense tracking & approvals",
    "Document vault",
    "Receipt storage",
  ];

  const PRO_FEATURES = [
    "Owner + 1 user included free",
    `$${PRICE_PER_PAID_USER}/mo per additional user`,
    "Unlimited trips",
    "Expense review & approvals",
    "Receipt & document storage",
    "Shared team analytics",
  ];

  return (
    <main className="min-h-dvh bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Wordmark iconClassName="brand-icon-mark size-8" textClassName="text-lg" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={state.redirectTo} className="secondary-button rounded-lg text-sm">
              <ArrowLeft className="size-3.5" /> Back
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary">
            {isPersonal ? "Upgrade plan" : "Upgrade workspace"}
          </p>
          <h1 className="mt-1.5 text-3xl font-bold">
            {isPersonal ? "Personal Pro plan" : "Add team members"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Upgrading <strong>{state.workspaceName}</strong>. Billing is handled securely by Paddle.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          {/* ── Left: plan + form ── */}
          <div className="space-y-5">
            {/* Plan card */}
            <article className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                  {isPersonal ? <User className="size-4" /> : <Users className="size-4" />}
                </span>
                <div>
                  <p className="text-lg font-bold">{isPersonal ? "Personal Plan" : "Pro Plan"}</p>
                  <p className="text-sm font-semibold text-primary">
                    {isPersonal
                      ? `$${PRICE_PER_PAID_USER}/month`
                      : `$${PRICE_PER_PAID_USER}/mo per additional user`}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isPersonal
                  ? "Unlock the full feature set for your personal expense tracking — one flat monthly rate, no per-seat pricing."
                  : `Your workspace includes the owner and one additional user at no cost. Each extra member beyond that is billed at $${PRICE_PER_PAID_USER}/month.`}
              </p>
              <ul className="space-y-2">
                {(isPersonal ? PERSONAL_FEATURES : PRO_FEATURES).map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </article>

            {/* Checkout form */}
            {isPaddleConfigured ? (
              <form action={startPaddleCheckoutAction} className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Checkout details</h2>
                </div>
                {isPersonal ? (
                  <input type="hidden" name="seats" value="1" />
                ) : (
                  <label className="block text-sm font-semibold">
                    Additional paid members
                    <input
                      name="seats"
                      type="number"
                      min={1}
                      max={999}
                      defaultValue={seats}
                      className="form-control mt-1 font-normal"
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Number of members beyond the 2 included free (owner + 1).
                    </span>
                  </label>
                )}
                <SubmitButton pendingText="Opening Paddle…" className="primary-button w-full rounded-lg">
                  Continue to payment <ArrowLeft className="size-3.5 rotate-180" />
                </SubmitButton>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3" /> Secured by Paddle · Cancel any time
                </div>
              </form>
            ) : (
              <div className="card p-5 text-center">
                <CreditCard className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm font-semibold">Paddle not configured</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Set <code className="rounded bg-secondary px-1 py-0.5">PADDLE_API_KEY</code> and{" "}
                  <code className="rounded bg-secondary px-1 py-0.5">PADDLE_PRICE_ID</code> to enable checkout.
                </p>
                <Link href={state.redirectTo} className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
                  Return to dashboard
                </Link>
              </div>
            )}
          </div>

          {/* ── Right: summary ── */}
          <div className="space-y-4">
            <article className="card p-5">
              <h2 className="mb-3 text-sm font-semibold">Order summary</h2>
              {isPersonal ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personal plan</span>
                    <span className="font-semibold">1 seat</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-base">${PRICE_PER_PAID_USER}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workspace</span>
                    <span className="font-semibold truncate max-w-[10rem] text-right">{state.workspaceName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Final price is calculated at checkout by Paddle based on your location and applicable taxes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Free users (included)</span>
                    <span className="font-semibold">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional paid users</span>
                    <span className="font-semibold">{seats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total members</span>
                    <span className="font-semibold">{2 + seats}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-base">${totalPerMonth}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workspace</span>
                    <span className="font-semibold truncate max-w-[10rem] text-right">{state.workspaceName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Final price is calculated at checkout by Paddle based on your location and applicable taxes.
                  </p>
                </div>
              )}
            </article>

            <article className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="size-3.5 text-primary" />
                <h2 className="text-sm font-semibold">Secure checkout</h2>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  "Payment processed by Paddle (Merchant of Record)",
                  "Tax handled automatically by region",
                  "Invoice sent to your email",
                  "Subscription activates immediately after payment",
                  "Cancel or adjust seats any time",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3 shrink-0 text-teal-600 dark:text-teal-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </main>
  );
}
