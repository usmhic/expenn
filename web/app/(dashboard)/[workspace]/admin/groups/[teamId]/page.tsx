import { notFound } from "next/navigation";
import { Map as MapIcon, Plane, Users, Wallet } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, type BreadcrumbItem } from "@/components/layout/navigation";
import { EmptyState, PageHeader, SectionCard, Stat } from "@/components/layout/page";
import { AddToTeamDialog } from "@/components/dialogs";
import { TripCard } from "@/components/trips/trip-card";
import { apiClient } from "@/lib/api-client";
import { formatTotals, totalsByCurrency } from "@/lib/expenses";

export default async function AdminTeamPage({ params }: { params: Promise<{ workspace: string; teamId: string }> }) {
  const { workspace, teamId } = await params;
  const adminRoot = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const orgId = currentUser.activeOrganizationId ?? "";

  const [allTeams, allTrips, allExpenses, approvals, teamMembers, members] = await Promise.all([
    api.organizations.getTeams(orgId),
    api.trips.list({}),
    api.expenses.list({}),
    api.trips.getApprovals({}),
    api.organizations.getTeamMembers(orgId, teamId),
    api.organizations.getMembers(orgId),
  ]);
  const team = allTeams.find((t) => t.id === teamId);
  if (!team) return notFound();
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";

  const trips = allTrips.filter((t) => t.teamId === teamId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const tripIds = new Set(trips.map((t) => t.id));
  const approved = allExpenses.filter((e) => e.tripId && tripIds.has(e.tripId) && ["approved", "reimbursed"].includes(e.status));
  const budgets = totalsByCurrency(trips.map((t) => ({ amount: t.budget, currency: t.currency })));
  const pendingApprovals = approvals.filter((a) => tripIds.has(a.tripId) && a.status === "requested");

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "People & settings", href: `${adminRoot}/settings` },
    {
      label: team.name,
      items: allTeams.filter((t) => t.id !== teamId).map((t) => ({ label: t.name, href: `${adminRoot}/groups/${t.id}` })),
      addHref: `${adminRoot}/settings`,
      addLabel: "New team",
    },
  ];

  return (
    <AppShell role={role} breadcrumbs={breadcrumbs}>
      <PageHeader
        eyebrow="Team"
        title={team.name}
        description={`${teamMembers.length} member${teamMembers.length === 1 ? "" : "s"} · ${trips.length} trip${trips.length === 1 ? "" : "s"}`}
        actions={<AddToTeamDialog teams={[team]} members={members} />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Members" value={String(teamMembers.length)} />
        <Stat icon={Plane} label="Trips" value={String(trips.length)} sub={pendingApprovals.length ? `${pendingApprovals.length} approvals pending` : undefined} />
        <Stat icon={Wallet} label="Approved spend" value={formatTotals(totalsByCurrency(approved), "—")} />
        <Stat icon={MapIcon} label="Total budget" value={formatTotals(budgets, "—")} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h2 className="section-title mb-3">Trips</h2>
          {trips.length === 0 ? (
            <div className="card"><EmptyState icon={MapIcon} title="No trips for this team yet" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trips.map((trip) => <TripCard key={trip.id} trip={trip} href={`${adminRoot}/trips/${trip.id}`} pending={pendingApprovals.filter((a) => a.tripId === trip.id).length} />)}
            </div>
          )}
        </section>
        <SectionCard title="Members">
          <ul className="divide-list">
            {teamMembers.map((m) => (
              <li key={m.id} className="list-row">
                <span className="avatar">{(m.name || m.email)[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                </span>
              </li>
            ))}
            {teamMembers.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">No members yet.</li>}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
