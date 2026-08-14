import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge, type BreadcrumbItem } from "@/components/layout/navigation";
import { InviteMemberDialog } from "@/components/dialogs";
import { HeroStat } from "@/components/ui/hero-stat";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateObj);
}

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; teamId: string }>;
}) {
  const { workspace, teamId } = await params;
  const adminRoot = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const orgId = currentUser.activeOrganizationId || workspace;

  const [allTeams, allTrips, allExpenses, approvals, teamMembers] = await Promise.all([
    api.organizations.getTeams(orgId),
    api.trips.list({}),
    api.expenses.list({}),
    api.trips.getApprovals({}),
    api.organizations.getTeamMembers(orgId, teamId),
  ]);

  const team = allTeams.find((t) => t.id === teamId);
  if (!team) return notFound();

  const trips = allTrips.filter((t) => t.teamId === teamId);

  const tripIds = new Set(trips.map((t) => t.id));
  const tripExpenses = allExpenses.filter((e) => e.tripId && tripIds.has(e.tripId));
  const totalSpend = tripExpenses.filter((e) => ["approved", "reimbursed"].includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const totalBudget = trips.reduce((s, t) => s + Number(t.budget), 0);
  const pendingApprovals = approvals.filter((a) => tripIds.has(a.tripId) && a.status === "requested");

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: team.name,
      items: allTeams
        .filter((t) => t.id !== teamId)
        .map((t) => ({ label: t.name, href: `${adminRoot}/groups/${t.id}` })),
      addHref: `${adminRoot}/settings`,
      addLabel: "New group",
    },
  ];

  return (
    <AppShell role="admin" breadcrumbs={breadcrumbs}>
      <section className="w-full space-y-5">
        {/* Hero */}
        <article className="trip-detail-hero">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary/70">Group</p>
            <h1 className="mt-1 text-xl font-bold">{team.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {teamMembers.length} member{teamMembers.length === 1 ? "" : "s"} · {trips.length} trip{trips.length === 1 ? "" : "s"}
              {pendingApprovals.length > 0 && (
                <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                  · {pendingApprovals.length} approval{pendingApprovals.length !== 1 ? "s" : ""} pending
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <HeroStat label="Budget" value={fmtMoney(totalBudget)} />
            <HeroStat label="Approved spend" value={fmtMoney(totalSpend)} />
          </div>
        </article>

        {/* Budget bar */}
        {totalBudget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Budget utilization</span>
              <span>{Math.round((totalSpend / totalBudget) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.round((totalSpend / totalBudget) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Trips list */}
        <article className="card p-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-border/60">
            <h2 className="text-sm font-semibold">Trips</h2>
            <span className="text-xs text-muted-foreground">{trips.length} total</span>
          </div>
          <div className="divide-y divide-border/60">
            {trips.map((trip) => {
              const pending = approvals.filter((a) => a.tripId === trip.id && a.status === "requested").length;
              return (
                <Link
                  key={trip.id}
                  href={`${adminRoot}/trips/${trip.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{trip.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {trip.destination} · {fmt(trip.startDate)} – {fmt(trip.endDate)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {pending > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                        {pending} pending
                      </span>
                    )}
                    <StatusBadge value={trip.status} />
                    <ArrowRight className="size-3.5 text-muted-foreground/50" />
                  </div>
                </Link>
              );
            })}
            {trips.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No trips in this group yet.</p>
            )}
          </div>
        </article>

        {/* Members */}
        <article className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold">Members</h2>
            <InviteMemberDialog />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/35 p-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-[0.75rem] font-bold text-primary-foreground shadow-elegant">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                </span>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-3">No members yet.</p>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}
