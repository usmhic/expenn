import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge, type BreadcrumbItem } from "@/components/layout/navigation";
import { PageHeader, SectionCard } from "@/components/layout/page";
import { AssignTravelersDialog, InviteMemberDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { ExpenseTable, type CommentRow } from "@/components/expense-table";
import { EditTripDialog } from "@/components/trips/edit-trip-dialog";
import { TripBookings } from "@/components/trips/trip-bookings";
import { TripCostSummary } from "@/components/trips/trip-costs";
import { TripPlannerSection } from "@/components/trips/trip-planner-section";
import { tripKindLabel } from "@/lib/bookings";
import { apiClient, type ItineraryDto } from "@/lib/api-client";
import { formatMoney } from "@/lib/expenses";
import { formatDateRange, formatDistance, formatDuration, tripDays, tripPhase } from "@/lib/trips";

function fmt(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export default async function AdminTripDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; tripId: string }>;
}) {
  const { workspace, tripId } = await params;
  const adminRoot = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const orgId = currentUser.activeOrganizationId ?? "";

  const trip = await api.trips.getById(tripId).catch(() => null);
  if (!trip) return notFound();

  const [expenses, members, travelers, approvals, allTrips, allTeams, tripComments, itinerary, costs, bookings] = await Promise.all([
    api.expenses.list({ tripId }),
    api.organizations.getMembers(orgId),
    api.trips.getTravelers(tripId),
    api.trips.getApprovals({ tripId }),
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.comments.listForTrip(tripId),
    api.trips.getItinerary(tripId).catch((): ItineraryDto => ({ tripId, profile: "driving-car", stops: [], routingEnabled: false })),
    api.trips.getCosts(tripId).catch(() => null),
    api.trips.getBookings(tripId).catch(() => []),
  ]);
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";

  // Drafts are private to travelers until submitted.
  const reviewable = expenses.filter((e) => e.status !== "draft");
  const pendingExpenses = reviewable.filter((e) => e.status === "submitted");
  const partySize = costs?.partySize ?? Math.max(1, travelers.length) + (trip.companions?.length ?? 0);
  const phase = tripPhase(trip.startDate, trip.endDate);
  const tripTeam = allTeams.find((t) => t.id === trip.teamId);
  const route = itinerary.route;

  const commentsByExpense = tripComments.reduce<Record<string, CommentRow[]>>((acc, c) => {
    (acc[c.expenseId] ??= []).push({ ...c, createdAt: new Date(c.createdAt) });
    return acc;
  }, {});

  const owed = reviewable
    .filter((e) => e.reimbursable && ["approved", "reimbursed"].includes(e.status))
    .reduce<Record<string, { name: string; currency: string; total: number; paid: number }>>((acc, e) => {
      const key = `${e.userId}:${e.currency}`;
      acc[key] ??= { name: e.travelerName ?? members.find((m) => m.userId === e.userId)?.name ?? "Unknown", currency: e.currency, total: 0, paid: 0 };
      acc[key].total += Number(e.amount);
      if (e.status === "reimbursed") acc[key].paid += Number(e.amount);
      return acc;
    }, {});

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Trips", href: `${adminRoot}/trips` },
    {
      label: trip.name,
      items: allTrips.filter((t) => t.id !== trip.id).map((t) => ({ label: t.name, href: `${adminRoot}/trips/${t.id}` })),
      addHref: `${adminRoot}/trips`,
      addLabel: "New trip",
    },
  ];

  return (
    <AppShell role={role} breadcrumbs={breadcrumbs}>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
            <StatusBadge value={trip.status} />
            <span className="chip py-0.5 text-[0.7rem]">{tripKindLabel(trip.kind)}</span>
            {tripTeam && <span className="chip py-0.5"><Users className="size-3" />{tripTeam.name}</span>}
            <span className="text-xs font-medium text-muted-foreground">
              {phase.kind === "ongoing" ? `Day ${phase.days} of ${tripDays(trip.startDate, trip.endDate)}` : phase.kind === "upcoming" ? `Starts in ${phase.days} day${phase.days === 1 ? "" : "s"}` : "Trip ended"}
            </span>
          </span>
        }
        title={trip.name}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5"><MapPin className="size-4" />{trip.routeSummary ?? trip.destination}</span>
            <span className="flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span className="flex items-center gap-1.5"><Users className="size-4" />{partySize} {partySize === 1 ? "person" : "people"}</span>
          </span>
        }
        actions={
          <>
            <EditTripDialog trip={trip} personal={false} />
            {role === "admin" && <InviteMemberDialog compact />}
            <AssignTravelersDialog
              tripId={trip.id}
              travelers={members.map((m) => ({ userId: m.userId, name: m.name || m.email }))}
              assignedIds={travelers.map((t) => t.userId)}
            />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-5">
        {costs && <TripCostSummary costs={costs} company showPeople />}
        <TripBookings
          trip={{
            id: trip.id, name: trip.name, currency: trip.currency, status: trip.status, destination: trip.destination,
            startDate: trip.startDate, endDate: trip.endDate, partySize, origin: itinerary.stops[0]?.name,
          }}
          bookings={bookings}
          canEdit
          company
        />
        <SectionCard title="Receipts to review" description={pendingExpenses.length ? `${pendingExpenses.length} waiting for a decision` : "Nothing waiting"}>
          <ExpenseTable
            expenses={reviewable.map((e) => ({ ...e, expenseDate: new Date(e.expenseDate) }))}
            showTraveler
            showReview
            tripId={tripId}
            defaultTab={pendingExpenses.length > 0 ? "submitted" : "all"}
            emptyMessage="No submitted expenses on this trip yet."
            comments={commentsByExpense}
          />
        </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Travelers & approvals" description={`${travelers.length} assigned`}>
            {travelers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No one is assigned yet. Use “Assign travelers” above.</p>
            ) : (
              <ul className="divide-list">
                {travelers.map((t) => {
                  const approval = approvals.find((a) => a.userId === t.userId);
                  return (
                    <li key={t.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="avatar">{t.name[0]?.toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{t.email}</span>
                        </span>
                        {approval ? (
                          <StatusBadge value={approval.status} />
                        ) : (
                          <span className="text-xs text-subtle">No request</span>
                        )}
                      </div>
                      {approval?.purpose && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{approval.purpose}</p>}
                      {approval?.status === "requested" && (
                        <div className="mt-2.5"><ReviewApprovalButtons approvalId={approval.id} /></div>
                      )}
                      {approval?.status === "approved" && approval.decidedAt && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-teal-700 dark:text-teal-300"><CheckCircle2 className="size-3.5" /> Approved {fmt(approval.decidedAt)}</p>
                      )}
                      {approval?.status === "rejected" && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive"><XCircle className="size-3.5" /> Declined</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {Object.keys(owed).length > 0 && (
            <SectionCard title="Reimbursement">
              <ul className="divide-list">
                {Object.entries(owed).map(([key, row]) => {
                  const due = row.total - row.paid;
                  return (
                    <li key={key} className="list-row">
                      <span className="avatar">{row.name[0]?.toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.name}</span>
                        <span className="block text-xs text-muted-foreground">{formatMoney(row.total, row.currency)} approved</span>
                      </span>
                      {due < 0.01 ? (
                        <StatusBadge value="reimbursed" label="Paid" />
                      ) : (
                        <span className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">{formatMoney(due, row.currency)} due</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <section className="mt-6" aria-labelledby="trip-route-title">
        <div className="mb-3">
          <h2 id="trip-route-title" className="text-base font-semibold tracking-tight">Route &amp; stops</h2>
          <p className="text-sm text-muted-foreground">
            {route ? `${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)} travel · ${itinerary.stops.length} stops` : "Optional: pin the places the trip visits."}
          </p>
        </div>
        <TripPlannerSection
          trip={{ id: trip.id, name: trip.name, currency: trip.currency, startDate: trip.startDate, endDate: trip.endDate, status: trip.status }}
          itinerary={itinerary}
          canEdit
          canClaimMileage={false}
        />
      </section>
    </AppShell>
  );
}
