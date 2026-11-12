import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { EmptyState, PageHeader } from "@/components/layout/page";
import { CreateTripDialog } from "@/components/dialogs";
import { TripCard } from "@/components/trips/trip-card";
import { apiClient } from "@/lib/api-client";
import { tripPhase } from "@/lib/trips";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "current", label: "Current & upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

export default async function TravelerTripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ workspace }, { view }] = await Promise.all([params, searchParams]);
  const filter = FILTERS.some((f) => f.key === view) ? (view as (typeof FILTERS)[number]["key"]) : "current";
  const root = `/${workspace}/traveler`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [trips, approvals, orgs] = await Promise.all([
    api.trips.list({ mine: true }),
    api.trips.getApprovals({ mine: true }),
    api.organizations.list().catch(() => []),
  ]);
  const personal = orgs.find((o) => o.slug === workspace)?.accountType === "personal";

  const withPhase = trips.map((t) => ({ trip: t, phase: tripPhase(t.startDate, t.endDate) }));
  const visible = withPhase
    .filter(({ phase }) => filter === "all" || (filter === "past" ? phase.kind === "past" : phase.kind !== "past"))
    .sort((a, b) =>
      filter === "past"
        ? b.trip.startDate.localeCompare(a.trip.startDate)
        : a.trip.startDate.localeCompare(b.trip.startDate)
    );
  const pendingApprovals = approvals.filter((a) => a.status === "requested").length;

  return (
    <AppShell role="traveler" personal={personal} breadcrumbs={[{ label: "Trips" }]}>
      <PageHeader
        title="Trips"
        description={
          personal
            ? "Plan each journey on the map, then log expenses against it."
            : "Trips you're travelling on. Open one to plan the route and log expenses."
        }
        actions={personal ? <CreateTripDialog teams={[]} travelers={[]} personal tripHrefBase={`${root}/trips`} /> : undefined}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="segmented" aria-label="Filter trips">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "current" ? `${root}/trips` : `${root}/trips?view=${f.key}`}
              aria-current={filter === f.key ? "page" : undefined}
              className="segmented-item"
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {pendingApprovals > 0 && (
          <span className="chip">{pendingApprovals} approval request{pendingApprovals === 1 ? "" : "s"} pending</span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={MapIcon}
            title={trips.length === 0 ? "No trips yet" : "Nothing here"}
            description={
              trips.length === 0
                ? personal
                  ? "Create a trip to plan stops and routes on the map and keep its expenses together."
                  : "When your admin adds you to a trip, it shows up here with its route and budget."
                : "Try another filter."
            }
            action={personal && trips.length === 0 ? <CreateTripDialog teams={[]} travelers={[]} personal tripHrefBase={`${root}/trips`} /> : undefined}
          />
        </div>
      ) : (
        <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
          {visible.map(({ trip }) => (
            <TripCard key={trip.id} trip={trip} href={`${root}/trips/${trip.id}`} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
