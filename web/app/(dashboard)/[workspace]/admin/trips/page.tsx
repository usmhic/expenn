import Link from "next/link";
import { Map as MapIcon, Plane } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { EmptyState, PageHeader, SectionCard } from "@/components/layout/page";
import { BulkApproveButtons, CreateTripDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { TripCard } from "@/components/trips/trip-card";
import { apiClient } from "@/lib/api-client";
import { tripPhase } from "@/lib/trips";

const FILTERS = [
  { key: "current", label: "Current & upcoming" },
  { key: "past", label: "Past" },
  { key: "draft", label: "Drafts" },
  { key: "all", label: "All" },
] as const;

export default async function AdminTripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string; team?: string }>;
}) {
  const [{ workspace }, query] = await Promise.all([params, searchParams]);
  const filter = FILTERS.some((f) => f.key === query.view) ? (query.view as (typeof FILTERS)[number]["key"]) : "current";
  const root = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const me = await api.auth.me();
  const orgId = me.activeOrganizationId ?? "";
  const [trips, teams, members, approvals] = await Promise.all([
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.organizations.getMembers(orgId),
    api.trips.getApprovals({}),
  ]);
  const role = me.organizationRole === "manager" ? "manager" : "admin";
  const teamFilter = teams.some((t) => t.id === query.team) ? query.team : undefined;

  const pending = approvals.filter((a) => a.status === "requested");
  const visible = trips
    .filter((t) => !teamFilter || t.teamId === teamFilter)
    .filter((t) => {
      const phase = tripPhase(t.startDate, t.endDate);
      if (filter === "draft") return t.status === "draft";
      if (filter === "past") return phase.kind === "past" || t.status === "completed";
      if (filter === "current") return phase.kind !== "past" && t.status !== "completed" && t.status !== "archived";
      return true;
    })
    .sort((a, b) => (filter === "past" ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)));

  const href = (next: { view?: string; team?: string }) => {
    const qs = new URLSearchParams();
    const v = next.view ?? filter;
    const t = "team" in next ? next.team : teamFilter;
    if (v !== "current") qs.set("view", v);
    if (t) qs.set("team", t);
    const s = qs.toString();
    return s ? `${root}/trips?${s}` : `${root}/trips`;
  };

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Trips" }]}>
      <PageHeader
        title="Trips"
        description="Budgets, approvals and itineraries for every trip your teams take."
        actions={
          <CreateTripDialog
            teams={teams}
            travelers={members.map((m) => ({ userId: m.userId, name: m.name || m.email }))}
            tripHrefBase={`${root}/trips`}
          />
        }
      />

      {pending.length > 0 && (
        <SectionCard
          className="mb-6"
          title={`Travel requests · ${pending.length}`}
          description="Travelers waiting for a go-ahead"
          action={pending.length > 1 ? <BulkApproveButtons approvalIds={pending.map((a) => a.id)} /> : undefined}
        >
          <ul className="divide-list">
            {pending.slice(0, 6).map((a) => (
              <li key={a.id} className="list-row flex-wrap">
                <span className="avatar">{a.travelerName[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.travelerName} · <Link href={`${root}/trips/${a.tripId}`} className="hover:text-primary">{a.tripName}</Link></span>
                  <span className="block truncate text-xs text-muted-foreground">{a.purpose ?? a.destination}</span>
                </span>
                <ReviewApprovalButtons approvalId={a.id} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <nav className="segmented" aria-label="Filter trips">
          {FILTERS.map((f) => (
            <Link key={f.key} href={href({ view: f.key })} aria-current={filter === f.key ? "page" : undefined} className="segmented-item">
              {f.label}
            </Link>
          ))}
        </nav>
        {teams.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Link href={href({ team: undefined })} aria-current={!teamFilter ? "page" : undefined} className="chip chip-button">All teams</Link>
            {teams.map((t) => (
              <Link key={t.id} href={href({ team: t.id })} aria-current={teamFilter === t.id ? "page" : undefined} className="chip chip-button">{t.name}</Link>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={trips.length === 0 ? Plane : MapIcon}
            title={trips.length === 0 ? "Plan your first trip" : "No trips in this view"}
            description={
              trips.length === 0
                ? "Create a trip, assign travelers and map out the route. Approvals and expenses follow from there."
                : "Try another filter or team."
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              href={`${root}/trips/${trip.id}`}
              pending={pending.filter((a) => a.tripId === trip.id).length}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
