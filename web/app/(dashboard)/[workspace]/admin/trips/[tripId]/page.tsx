import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, Receipt, Route as RouteIcon, Users, Wallet, XCircle } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge, type BreadcrumbItem } from "@/components/layout/navigation";
import { PageHeader, SectionCard, Stat } from "@/components/layout/page";
import { AssignTravelersDialog, InviteMemberDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { ExpenseTable, type CommentRow } from "@/components/expense-table";
import { TripPlannerSection } from "@/components/trips/trip-planner-section";
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

  const [expenses, members, travelers, approvals, allTrips, allTeams, tripComments, itinerary] = await Promise.all([
    api.expenses.list({ tripId }),
    api.organizations.getMembers(orgId),
    api.trips.getTravelers(tripId),
    api.trips.getApprovals({ tripId }),
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.comments.listForTrip(tripId),
    api.trips.getItinerary(tripId).catch((): ItineraryDto => ({ tripId, profile: "driving-car", stops: [], routingEnabled: false })),
  ]);
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";

  // Budget math only counts expenses in the trip's currency.
  const inTripCurrency = expenses.filter((e) => e.currency === trip.currency);
  const approvedSpend = inTripCurrency.filter((e) => ["approved", "reimbursed"].includes(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const pendingSpend = inTripCurrency.filter((e) => e.status === "submitted").reduce((s, e) => s + Number(e.amount), 0);
  const budget = Number(trip.budget);
  const budgetPct = budget > 0 ? Math.round((approvedSpend / budget) * 100) : 0;

  // Drafts are private to travelers until submitted.
  const reviewable = expenses.filter((e) => e.status !== "draft");
  const pendingExpenses = reviewable.filter((e) => e.status === "submitted");
  const pendingApprovals = approvals.filter((a) => a.status === "requested");
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
          </span>
        }
        actions={
          <>
            {role === "admin" && <InviteMemberDialog compact />}
            <AssignTravelersDialog
              tripId={trip.id}
              travelers={members.map((m) => ({ userId: m.userId, name: m.name || m.email }))}
              assignedIds={travelers.map((t) => t.userId)}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat">
          <span className="stat-label"><Wallet className="size-4" /> Approved spend</span>
          <span className="stat-value">{formatMoney(approvedSpend, trip.currency, { compact: true })}</span>
          {budget > 0 ? (
            <>
              <div className="progress-track mt-1">
                <div className={`progress-bar ${budgetPct > 100 ? "bg-destructive" : budgetPct > 85 ? "bg-amber-500" : ""}`} style={{ width: `${Math.min(100, budgetPct)}%` }} />
              </div>
              <span className="stat-sub">
                {budgetPct}% of {formatMoney(budget, trip.currency, { compact: true })}
                {pendingSpend > 0 && ` · +${formatMoney(pendingSpend, trip.currency, { compact: true })} in review`}
              </span>
            </>
          ) : (
            <span className="stat-sub">No budget set</span>
          )}
        </div>
        <Stat icon={RouteIcon} label="Route" value={route ? formatDistance(route.distanceMeters) : "—"} sub={route ? `${formatDuration(route.durationSeconds)} · ${itinerary.stops.length} stops` : "Not planned yet"} />
        <Stat icon={Users} label="Travelers" value={String(travelers.length)} sub={pendingApprovals.length ? `${pendingApprovals.length} awaiting approval` : "All decided"} tone={pendingApprovals.length ? "warning" : undefined} />
        <Stat icon={Receipt} label="To review" value={String(pendingExpenses.length)} sub={`${reviewable.length} submitted in total`} tone={pendingExpenses.length ? "primary" : undefined} />
      </div>

      <section className="mb-6" aria-label="Route planner">
        <TripPlannerSection
          trip={{ id: trip.id, name: trip.name, currency: trip.currency, startDate: trip.startDate, endDate: trip.endDate, status: trip.status }}
          itinerary={itinerary}
          canEdit
          canClaimMileage={false}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <SectionCard title="Expenses" description={pendingExpenses.length ? `${pendingExpenses.length} waiting for a decision` : "Nothing waiting"}>
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
    </AppShell>
  );
}
