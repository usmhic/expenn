import Link from "next/link";
import { ArrowRight, MapPin, Plane, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { BulkApproveButtons, CreateTripDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { apiClient } from "@/lib/api-client";

function formatDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dateObj);
}

export default async function AdminDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ workspace }, { error }] = await Promise.all([params, searchParams]);
  const adminRoot = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const orgId = currentUser.activeOrganizationId || workspace;
  const [trips, teams, members, approvals, expenses] = await Promise.all([
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.organizations.getMembers(orgId),
    api.trips.getApprovals({}),
    api.expenses.list({}),
  ]);
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";

  const pendingApprovals = approvals.filter((a) => a.status === "requested");
  const pendingExpenses = expenses.filter((e) => e.status === "submitted");
  const travelers = members.filter((m) => m.role === "traveler");

  const tripsByTeam = new Map<string, typeof trips>();
  for (const trip of trips) {
    const key = trip.teamId ?? "__none__";
    const arr = tripsByTeam.get(key) ?? [];
    arr.push(trip);
    tripsByTeam.set(key, arr);
  }

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Trips" }]}>
      <div className="w-full space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {decodeURIComponent(error)}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Trips</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {trips.length} trip{trips.length !== 1 ? "s" : ""}
              {pendingApprovals.length > 0 && (
                <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                  · {pendingApprovals.length} approval{pendingApprovals.length !== 1 ? "s" : ""} pending
                </span>
              )}
              {pendingExpenses.length > 0 && (
                <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                  · {pendingExpenses.length} expense{pendingExpenses.length !== 1 ? "s" : ""} to review
                </span>
              )}
            </p>
          </div>
          <CreateTripDialog teams={teams} travelers={travelers} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ── Left: trips list ── */}
          <div className="min-w-0 space-y-4">
            {/* Trips by team */}
            {teams.map((team) => {
              const teamTrips = tripsByTeam.get(team.id) ?? [];
              if (teamTrips.length === 0) return null;
              return (
                <article key={team.id} className="card p-0">
                  <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-secondary">
                        <Users className="size-3 text-muted-foreground" />
                      </span>
                      <Link href={`${adminRoot}/groups/${team.id}`} className="text-sm font-semibold hover:text-primary hover:underline transition-colors">
                        {team.name}
                      </Link>
                    </div>
                    <span className="text-xs text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {teamTrips.map((trip) => {
                      const pending = approvals.filter((a) => a.tripId === trip.id && a.status === "requested").length;
                      return (
                        <Link key={trip.id} href={`${adminRoot}/trips/${trip.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MapPin className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{trip.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {trip.destination} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
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
                  </div>
                </article>
              );
            })}

            {/* Unassigned */}
            {(tripsByTeam.get("__none__") ?? []).length > 0 && (
              <article className="card p-0">
                <div className="px-4 pt-3 pb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No team assigned</h2>
                </div>
                <div className="divide-y divide-border/60">
                  {(tripsByTeam.get("__none__") ?? []).map((trip) => (
                    <Link key={trip.id} href={`${adminRoot}/trips/${trip.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MapPin className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{trip.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{trip.destination} · {formatDate(trip.startDate)}</span>
                      </span>
                      <StatusBadge value={trip.status} />
                      <ArrowRight className="size-3.5 text-muted-foreground/50" />
                    </Link>
                  ))}
                </div>
              </article>
            )}

            {trips.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Plane className="mx-auto mb-3 size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No trips yet. Click &ldquo;New trip&rdquo; to create your first trip.</p>
              </div>
            )}
          </div>

          {/* ── Right: approval queue ── */}
          <aside className="space-y-4">
            <article className="card p-0">
              <div className="px-4 pt-3 pb-2 border-b border-border/60 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Approval queue</h2>
                  {pendingApprovals.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                      {pendingApprovals.length}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All clear</span>
                  )}
                </div>
                {pendingApprovals.length > 1 && (
                  <BulkApproveButtons approvalIds={pendingApprovals.map((a) => a.id)} />
                )}
              </div>
              <div className="divide-y divide-border/60">
                {pendingApprovals.slice(0, 8).map((approval) => (
                  <div key={approval.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{approval.travelerName}</p>
                        <p className="truncate text-xs text-muted-foreground">{approval.tripName}</p>
                      </div>
                      <StatusBadge value={approval.status} />
                    </div>
                    {approval.purpose && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{approval.purpose}</p>}
                    <div className="mt-2">
                      <ReviewApprovalButtons approvalId={approval.id} />
                    </div>
                  </div>
                ))}
                {pendingApprovals.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">No pending approvals.</p>
                )}
              </div>
            </article>

            {pendingExpenses.length > 0 && (
              <article className="card p-0">
                <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-border/60">
                  <h2 className="text-sm font-semibold">Expense review</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-400/15 dark:text-blue-200">
                    {pendingExpenses.length}
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {pendingExpenses.slice(0, 5).map((e) => (
                    <Link
                      key={e.id}
                      href={e.tripId ? `${adminRoot}/trips/${e.tripId}` : adminRoot}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{e.merchant}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.travelerName} · {e.category}</p>
                      </div>
                      <span className="text-sm font-semibold shrink-0">{e.currency} {Number(e.amount).toFixed(2)}</span>
                    </Link>
                  ))}
                </div>
                {pendingExpenses.length > 5 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground">+{pendingExpenses.length - 5} more — open a trip to review</p>
                )}
              </article>
            )}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
