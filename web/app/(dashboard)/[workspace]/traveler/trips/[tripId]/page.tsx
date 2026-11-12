import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays, Camera, CheckCircle2, Clock, FileText, MapPin, Receipt, Route as RouteIcon, ShieldCheck, Wallet,
} from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { EmptyState, PageHeader, SectionCard, Stat } from "@/components/layout/page";
import { CreateExpenseDialog, RequestApprovalDialog } from "@/components/dialogs";
import { TripPlannerSection } from "@/components/trips/trip-planner-section";
import { apiClient, type ItineraryDto } from "@/lib/api-client";
import { formatMoney } from "@/lib/expenses";
import { formatDateRange, formatDistance, formatDuration, tripDays, tripPhase } from "@/lib/trips";

function fmt(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export default async function TravelerTripDetailPage({ params }: { params: Promise<{ workspace: string; tripId: string }> }) {
  const { workspace, tripId } = await params;
  const root = `/${workspace}/traveler`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const trip = await api.trips.getById(tripId).catch(() => null);
  if (!trip) return notFound();

  const [expenses, allDocuments, approvals, allTrips, currentUser, travelers, itinerary, orgs] = await Promise.all([
    api.expenses.list({ tripId, mine: true }),
    api.documents.list({}).catch(() => []),
    api.trips.getApprovals({ tripId, mine: true }),
    api.trips.list({ mine: true }),
    api.auth.me(),
    api.trips.getTravelers(tripId),
    api.trips.getItinerary(tripId).catch((): ItineraryDto => ({ tripId, profile: "driving-car", stops: [], routingEnabled: false })),
    api.organizations.list().catch(() => []),
  ]);

  const personal = orgs.find((o) => o.slug === workspace)?.accountType === "personal";
  const documents = allDocuments.filter((d) => d.tripId === tripId);
  const approval = approvals[0];
  const spent = expenses
    .filter((e) => e.currency === trip.currency && e.status !== "rejected")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const canRequestApproval = !approval || approval.status === "rejected" || approval.status === "cancelled";
  const isAssigned = travelers.some((t) => t.userId === currentUser.id);
  const budget = Number(trip.budget);
  const budgetPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const phase = tripPhase(trip.startDate, trip.endDate);
  const route = itinerary.route;

  return (
    <AppShell
      role="traveler"
      personal={personal}
      breadcrumbs={[
        { label: "Trips", href: `${root}/trips` },
        {
          label: trip.name,
          items: allTrips.filter((t) => t.id !== trip.id).map((t) => ({ label: t.name, href: `${root}/trips/${t.id}` })),
        },
      ]}
    >
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
            <StatusBadge value={trip.status} />
            {approval && <StatusBadge value={approval.status} label={approval.status === "requested" ? "Approval pending" : approval.status === "approved" ? "Approved to travel" : undefined} />}
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
            {canRequestApproval && isAssigned && !personal && <RequestApprovalDialog tripId={trip.id} />}
            <Link href={`${root}/capture`} className="secondary-button"><Camera className="size-4" /> Capture</Link>
            <CreateExpenseDialog
              trips={[{ id: trip.id, name: trip.name, currency: trip.currency, status: "active" }]}
              defaultCurrency={trip.currency}
              defaults={{ tripId: trip.id, currency: trip.currency }}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="stat">
          <span className="stat-label"><Wallet className="size-4" /> Spent</span>
          <span className="stat-value">{formatMoney(spent, trip.currency, { compact: true })}</span>
          {budget > 0 ? (
            <>
              <div className="progress-track mt-1">
                <div className={`progress-bar ${budgetPct > 100 ? "bg-destructive" : budgetPct > 85 ? "bg-amber-500" : ""}`} style={{ width: `${Math.min(100, budgetPct)}%` }} />
              </div>
              <span className="stat-sub">{budgetPct}% of {formatMoney(budget, trip.currency, { compact: true })} budget</span>
            </>
          ) : (
            <span className="stat-sub">No budget set</span>
          )}
        </div>
        <Stat icon={RouteIcon} label="Route" value={route ? formatDistance(route.distanceMeters) : "—"} sub={route ? `${formatDuration(route.durationSeconds)} travel · ${itinerary.stops.length} stops` : "Add stops to plan it"} />
        <Stat icon={Receipt} label="Expenses" value={String(expenses.length)} sub={`${expenses.filter((e) => e.status === "draft").length} draft · ${expenses.filter((e) => e.status === "submitted").length} in review`} />
        <Stat icon={FileText} label="Documents" value={String(documents.length)} sub="Tickets, bookings, visas" />
      </div>

      <section className="mb-6" aria-label="Route planner">
        <TripPlannerSection
          trip={{ id: trip.id, name: trip.name, currency: trip.currency, startDate: trip.startDate, endDate: trip.endDate, status: trip.status }}
          itinerary={itinerary}
          canEdit={isAssigned || personal}
          canClaimMileage={isAssigned || personal}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <SectionCard
          title="Expenses on this trip"
          description={expenses.length > 0 ? `${formatMoney(spent, trip.currency)} logged` : undefined}
          action={<Link href={`${root}/expenses?trip=${trip.id}`} className="text-sm font-medium text-primary hover:underline">View all</Link>}
        >
          {expenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" description="Snap receipts as you go — they'll be filed under this trip." />
          ) : (
            <ul className="divide-list">
              {expenses.slice(0, 8).map((e) => (
                <li key={e.id} className="list-row">
                  <span className="icon-tile size-9"><Receipt className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.merchant}</span>
                    <span className="block truncate text-xs text-muted-foreground">{fmt(e.expenseDate)} · {e.category}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(e.amount, e.currency)}</span>
                    <StatusBadge value={e.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-5">
          {!personal && (
            <section className="card">
              <div className="flex items-start gap-3">
                <span className="icon-tile icon-tile-primary"><ShieldCheck className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="card-title">Travel approval</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {!approval
                      ? isAssigned ? "Ask your manager to approve this trip before you go." : "You're not assigned to this trip."
                      : approval.status === "approved"
                        ? `Approved${approval.decidedAt ? ` on ${fmt(approval.decidedAt)}` : ""}. Have a good trip.`
                        : approval.status === "rejected"
                          ? "Your request was declined. You can update it and ask again."
                          : `Requested on ${fmt(approval.createdAt)} — waiting for a decision.`}
                  </p>
                  {approval?.purpose && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">{approval.purpose}</p>}
                </div>
              </div>
              {approval?.status === "approved" && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-300"><CheckCircle2 className="size-4" /> Cleared to travel</p>
              )}
              {approval?.status === "requested" && (
                <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300"><Clock className="size-4" /> Pending review</p>
              )}
            </section>
          )}

          <SectionCard
            title="Documents"
            action={<Link href={`${root}/documents`} className="text-sm font-medium text-primary hover:underline">Manage</Link>}
          >
            {documents.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">No documents attached to this trip yet. Add tickets or bookings from your vault.</p>
            ) : (
              <ul className="divide-list">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <Link href={`${root}/documents/${doc.id}`} className="list-row">
                      <span className="icon-tile size-9"><FileText className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{doc.title}</span>
                        <span className="block truncate text-xs capitalize text-muted-foreground">{doc.kind.replace("_", " ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
