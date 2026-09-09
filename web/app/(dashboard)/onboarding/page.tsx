import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight, Building2, Check, CheckCircle2, FileText,
  MailCheck, ReceiptText, Route, UsersRound, Wallet,
} from "lucide-react";
import { acceptInvitationAction, createPersonalWorkspaceAction, createWorkspaceAction } from "@/app/actions";
import { apiClient, type MyInvitationDto } from "@/lib/api-client";
import { Wordmark } from "@/components/layout/wordmark";
import { SubmitButton } from "@/components/ui/submit-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { roleHome } from "@/server/workspace";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const [{ invite: selectedInviteId, error }, cookieHeader] = await Promise.all([
    searchParams,
    cookies(),
  ]);

  const api = apiClient({ cookie: cookieHeader.toString() });

  let me;
  try {
    me = await api.auth.me();
  } catch {
    redirect("/login?error=session-required");
  }

  const [orgs, pendingInvites] = await Promise.all([
    api.organizations.list(),
    api.organizations.myInvitations().catch(() => [] as MyInvitationDto[]),
  ]);

  const membership = orgs[0];
  const hasWorkspace = Boolean(membership);
  const homeHref = membership ? roleHome(me.organizationRole ?? "traveler", membership.slug) : null;
  const selectedInvite = pendingInvites.find((i) => i.id === selectedInviteId) ?? pendingInvites[0];
  const showChoiceScreen = !hasWorkspace && pendingInvites.length === 0;

  // Auto-redirect to dashboard if user already has a workspace and no invite to handle
  if (hasWorkspace && !selectedInviteId && pendingInvites.length === 0 && !error) {
    redirect(homeHref!);
  }

  const adminRoot = membership ? `/${membership.slug}/admin` : null;
  const travelerRoot = membership ? `/${membership.slug}/traveler` : null;

  return (
    <main className="min-h-dvh bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Wordmark iconClassName="brand-icon-mark size-8" textClassName="text-lg" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {homeHref && (
              <Link href={homeHref} className="secondary-button rounded-lg text-sm">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary">Workspace setup</p>
          <h1 className="mt-1.5 text-3xl font-bold">
            {hasWorkspace ? "Manage workspaces" : "Get started"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {hasWorkspace
              ? "Accept a pending invitation or create an additional workspace."
              : showChoiceScreen
              ? "Choose how you'd like to use Expenn — you can always add a company workspace later."
              : "Accept an invitation from your team, or create your own workspace."}
          </p>
        </div>

        {/* Error banner */}
        {error && <OnboardingAlert error={error} />}

        {showChoiceScreen ? (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              How will you use Expenn?
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="card flex flex-col p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Manage Personal Expenses</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Track your own spending, receipts, and trips. No setup required.
                    </p>
                  </div>
                </div>
                <form action={createPersonalWorkspaceAction} className="mt-auto">
                  <SubmitButton pendingText="Setting up…" className="primary-button rounded-lg text-sm w-full sm:w-auto">
                    Get started <ArrowRight className="size-3.5" />
                  </SubmitButton>
                </form>
              </article>

              <article className="card flex flex-col p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Manage Company Expenses</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Set up a workspace for your team and invite as many travelers as you need.
                    </p>
                  </div>
                </div>
                <form action={createWorkspaceAction} className="mt-auto space-y-3">
                  <label className="block text-sm font-semibold">
                    Workspace name
                    <input
                      name="name"
                      required
                      placeholder="Acme Corp Travel"
                      className="form-control mt-1 font-normal"
                    />
                  </label>
                  <SubmitButton pendingText="Creating…" className="primary-button rounded-lg text-sm w-full sm:w-auto">
                    Create workspace <ArrowRight className="size-3.5" />
                  </SubmitButton>
                </form>
              </article>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            {/* ── Left column ── */}
            <div className="space-y-5">
              {/* Invitation cards */}
              {pendingInvites.length > 0 && (
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Pending invitations ({pendingInvites.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingInvites.map((inv) => (
                      <article
                        key={inv.id}
                        className={`card p-5 transition-all ${selectedInvite?.id === inv.id ? "border-primary/40 bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
                            <MailCheck className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-bold">{inv.organizationName}</h3>
                              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-muted-foreground">
                                {inv.role}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Expires {new Date(inv.expiresAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Sent to {inv.email}</p>
                          </div>
                        </div>

                        <form action={acceptInvitationAction} className="mt-4">
                          <input type="hidden" name="invitationId" value={inv.id} />
                          <input type="hidden" name="organizationId" value={inv.organizationId} />
                          <SubmitButton pendingText="Joining…" className="primary-button rounded-lg text-sm">
                            <Check className="size-3.5" /> Accept &amp; join workspace
                          </SubmitButton>
                        </form>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Create workspace */}
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {hasWorkspace ? "Create another workspace" : "Create a workspace"}
                </h2>
                <article className="card p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold">New workspace</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Spin up another workspace for a different team or company.
                      </p>
                    </div>
                  </div>
                  <form action={createWorkspaceAction} className="space-y-3">
                    <label className="block text-sm font-semibold">
                      Workspace name
                      <input
                        name="name"
                        required
                        placeholder="Acme Corp Travel"
                        className="form-control mt-1 font-normal"
                      />
                    </label>
                    <SubmitButton pendingText="Creating…" className="primary-button rounded-lg text-sm w-full sm:w-auto">
                      Create workspace <ArrowRight className="size-3.5" />
                    </SubmitButton>
                  </form>
                </article>
              </section>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-5">
              {hasWorkspace && homeHref && (
                <article className="card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Workspace active</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your workspace <strong>{membership?.name}</strong> is ready.
                  </p>
                  <Link href={homeHref} className="primary-button rounded-lg text-sm">
                    Open dashboard <ArrowRight className="size-3.5" />
                  </Link>
                </article>
              )}

              {/* Quick-start guide */}
              {hasWorkspace && adminRoot && travelerRoot && (
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Quick start
                  </h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <QuickLink
                      icon={<Route className="size-4" />}
                      title="Create a trip"
                      text="Set destination, dates, budget."
                      href={adminRoot}
                    />
                    <QuickLink
                      icon={<ReceiptText className="size-4" />}
                      title="Log an expense"
                      text="Attach receipts for review."
                      href={`${travelerRoot}/expenses`}
                    />
                    <QuickLink
                      icon={<FileText className="size-4" />}
                      title="Store a document"
                      text="Passports, visas, itineraries."
                      href={`${travelerRoot}/documents`}
                    />
                    <QuickLink
                      icon={<UsersRound className="size-4" />}
                      title="Invite your team"
                      text="Send invitations from Settings."
                      href={`${adminRoot}/settings`}
                    />
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function OnboardingAlert({ error }: { error: string }) {
  const message =
    error === "invite-expired" ? "That invitation is no longer valid." :
    error === "invite-email-mismatch" ? "Sign in with the email address that received the invitation." :
    error === "database-required" ? "Database connection error. Please contact support." :
    "Something went wrong. Please try again.";

  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
      <span>{message}</span>
    </div>
  );
}

function QuickLink({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/60 group">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
