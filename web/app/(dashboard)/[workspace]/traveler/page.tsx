import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CalendarDays, CalendarRange, Camera, ImageOff, Map as MapIcon, Receipt, Undo2, Wallet,
} from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { EmptyState, PageHeader, SectionCard } from "@/components/layout/page";
import { CreateExpenseDialog, SubmitDraftsButton } from "@/components/dialogs";
import { RouteThumbnail } from "@/components/trips/trip-card";
import { apiClient } from "@/lib/api-client";
import { formatMoney, formatTotals, pick, totalsByCurrency } from "@/lib/expenses";
import { formatDateRange, tripDays, tripPhase } from "@/lib/trips";
import { cn } from "@/lib/utils";

function fmt(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export default async function TravelerHomePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const root = `/${workspace}/traveler`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [me, trips, expenses, approvals, summary, orgs] = await Promise.all([
    api.auth.me(),
    api.trips.list({ mine: true }),
    api.expenses.list({ mine: true }),
    api.trips.getApprovals({ mine: true }),
    api.expenses.summary(),
    api.organizations.list().catch(() => []),
  ]);
  const personal = orgs.find((o) => o.slug === workspace)?.accountType === "personal";

  const live = trips
    .map((t) => ({ trip: t, phase: tripPhase(t.startDate, t.endDate) }))
    .filter(({ phase, trip }) => phase.kind !== "past" && trip.status !== "completed" && trip.status !== "archived")
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
  const current = live.find((t) => t.phase.kind === "ongoing") ?? live[0];
  const currentTrip = current?.trip;
  const approval = currentTrip ? approvals.find((a) => a.tripId === currentTrip.id) : undefined;
  const costs = currentTrip ? await api.trips.getCosts(currentTrip.id).catch(() => null) : null;
  const spent = costs?.spent ?? 0;
  const tripTotal = costs?.total ?? 0;
  const budgetPct = currentTrip && currentTrip.budget > 0 ? Math.round((tripTotal / currentTrip.budget) * 100) : 0;

  // Personal spend over time, per currency (rejected receipts don't count).
  const now = new Date();
  const counted = expenses.filter((e) => e.status !== "rejected");
  const thisMonth = totalsByCurrency(counted.filter((e) => {
    const d = new Date(e.expenseDate);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }));
  const thisYear = totalsByCurrency(counted.filter((e) => new Date(e.expenseDate).getUTCFullYear() === now.getUTCFullYear()));

  const drafts = expenses.filter((e) => e.status === "draft");
  const sentBack = expenses.filter((e) => e.status === "rejected");
  const missingReceipts = expenses.filter((e) => !e.receiptFileUrl && (e.status === "draft" || e.status === "rejected"));
  const owed = formatTotals(pick(summary.byCurrency, "owed"), "");
  const inReview = formatTotals(pick(summary.byCurrency, "pending"), "");
  const firstName = (me.name ?? "").split(/[\s@.]/)[0];

  return (
    <AppShell role="traveler" personal={personal} breadcrumbs={[{ label: "Home" }]}>
      <PageHeader
        title={firstName ? `Hi ${firstName}` : "Welcome back"}
        description={currentTrip ? (current.phase.kind === "ongoing" ? `You're on day ${current.phase.days} of ${currentTrip.name}.` : `Next up: ${currentTrip.name}, in ${current.phase.days} day${current.phase.days === 1 ? "" : "s"}.`) : personal ? "Snap receipts as you go and see where your money goes." : "Capture receipts as you go and get paid back quickly."}
        actions={
          <>
            <CreateExpenseDialog trips={trips} defaultCurrency={expenses[0]?.currency} triggerClassName="secondary-button" />
            <Link href={`${root}/capture`} className="primary-button"><Camera className="size-4" /> Capture receipt</Link>
          </>
        }
      />

      {/* Current trip */}
      {currentTrip ? (
        <Link href={`${root}/trips/${currentTrip.id}`} className="card card-flush card-interactive mb-6 grid overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="page-eyebrow">{current.phase.kind === "ongoing" ? "On the road" : "Up next"}</span>
              {approval && <StatusBadge value={approval.status} label={approval.status === "requested" ? "Approval pending" : approval.status === "approved" ? "Approved" : undefined} />}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{currentTrip.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{currentTrip.routeSummary ?? currentTrip.destination}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDateRange(currentTrip.startDate, currentTrip.endDate)} · {tripDays(currentTrip.startDate, currentTrip.endDate)} days</span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-muted p-3">
                <p className="text-xs text-muted-foreground">Trip total so far</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(tripTotal, currentTrip.currency)}</p>
                {currentTrip.budget > 0 ? (
                  <>
                    <div className="progress-track mt-2"><div className={cn("progress-bar", budgetPct > 100 && "bg-destructive")} style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{budgetPct}% of {formatMoney(currentTrip.budget, currentTrip.currency, { compact: true })} budget</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{formatMoney(spent, currentTrip.currency)} in receipts</p>
                )}
              </div>
              <div className="surface-muted p-3">
                <p className="text-xs text-muted-foreground">Per person</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{costs ? formatMoney(costs.perPerson, currentTrip.currency) : "—"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {costs ? `${costs.partySize} ${costs.partySize === 1 ? "person" : "people"} · ${costs.bookingCount} booking${costs.bookingCount === 1 ? "" : "s"}` : "Add bookings and receipts"}
                </p>
              </div>
            </div>
            <span className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary">Open trip <ArrowRight className="size-4" /></span>
          </div>
          <div className="relative hidden min-h-56 border-l border-border bg-muted/40 md:block">
            <RouteThumbnail points={currentTrip.routePreview} className="absolute inset-0 h-full w-full" />
          </div>
        </Link>
      ) : (
        <div className="card mb-6">
          <EmptyState icon={MapIcon} title="No trips planned" description={personal ? "Create a trip to keep its bookings, receipts and total in one place." : "When you're added to a trip it appears here with its bookings, budget and approval."} action={<Link href={`${root}/trips`} className="secondary-button">Go to trips</Link>} />
        </div>
      )}

      {/* Money and actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {personal ? (
          <>
            <Link href={`${root}/expenses`} className="stat card-interactive border-mint/40 bg-mint/[0.07]">
              <span className="stat-label"><Wallet className="size-4 text-teal-600" /> This month</span>
              <span className="stat-value">{formatTotals(thisMonth, "—")}</span>
              <span className="stat-sub">{new Intl.DateTimeFormat("en", { month: "long" }).format(now)} spending</span>
            </Link>
            <Link href={`${root}/expenses`} className="stat card-interactive">
              <span className="stat-label"><CalendarRange className="size-4" /> This year</span>
              <span className="stat-value">{formatTotals(thisYear, "—")}</span>
              <span className="stat-sub">{counted.length} receipt{counted.length === 1 ? "" : "s"} in total</span>
            </Link>
          </>
        ) : (
          <>
        <Link href={`${root}/expenses?status=approved`} className="stat card-interactive border-mint/40 bg-mint/[0.07]">
          <span className="stat-label"><Wallet className="size-4 text-teal-600" /> Owed to you</span>
          <span className="stat-value">{owed || "—"}</span>
          <span className="stat-sub">Approved, payment on its way</span>
        </Link>
        <Link href={`${root}/expenses?status=submitted`} className="stat card-interactive">
          <span className="stat-label"><Receipt className="size-4" /> In review</span>
          <span className="stat-value">{inReview || "—"}</span>
          <span className="stat-sub">Waiting for your manager</span>
        </Link>
          </>
        )}
        {personal ? (
          <Link href={`${root}/trips`} className="stat card-interactive">
            <span className="stat-label"><MapIcon className="size-4" /> Trips this year</span>
            <span className="stat-value">{trips.filter((t) => new Date(t.startDate).getUTCFullYear() === now.getUTCFullYear()).length}</span>
            <span className="stat-sub">{live.length} coming up or under way</span>
          </Link>
        ) : (
        <Link href={`${root}/expenses?status=rejected`} className={cn("stat card-interactive", sentBack.length > 0 && "border-destructive/30 bg-destructive/[0.04]")}>
          <span className="stat-label"><Undo2 className={cn("size-4", sentBack.length > 0 && "text-destructive")} /> Sent back</span>
          <span className="stat-value">{sentBack.length}</span>
          <span className="stat-sub">{sentBack.length ? "Fix and resubmit to get paid" : "Nothing to fix"}</span>
        </Link>
        )}
        <div className="stat">
          <span className="stat-label"><AlertTriangle className="size-4" /> Drafts</span>
          <span className="stat-value">{drafts.length}</span>
          {drafts.length > 0 ? <SubmitDraftsButton draftIds={drafts.map((d) => d.id)} /> : <span className="stat-sub">All submitted</span>}
        </div>
      </div>

      {missingReceipts.length > 0 && (
        <Link href={`${root}/expenses?status=draft`} className="notice notice-warning mb-6 transition-colors hover:border-amber-400/60">
          <ImageOff className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span><strong>{missingReceipts.length}</strong> expense{missingReceipts.length === 1 ? " is" : "s are"} missing a receipt. Attach one before submitting.</span>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Your trips" action={<Link href={`${root}/trips`} className="text-sm font-medium text-primary hover:underline">All trips</Link>}>
          {live.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No upcoming trips.</p>
          ) : (
            <ul className="divide-list">
              {live.slice(0, 5).map(({ trip, phase }) => (
                <li key={trip.id}>
                  <Link href={`${root}/trips/${trip.id}`} className="list-row">
                    <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/60">
                      <RouteThumbnail points={trip.routePreview} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{trip.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{trip.routeSummary ?? trip.destination} · {fmt(trip.startDate)}</span>
                    </span>
                    <span className={cn("text-xs font-medium", phase.kind === "ongoing" ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground")}>
                      {phase.kind === "ongoing" ? `Day ${phase.days}` : `In ${phase.days} d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent expenses" action={<Link href={`${root}/expenses`} className="text-sm font-medium text-primary hover:underline">View all</Link>}>
          {expenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" description="Snap your first receipt — it takes about ten seconds." />
          ) : (
            <ul className="divide-list">
              {expenses.slice(0, 5).map((e) => (
                <li key={e.id} className="list-row">
                  <span className="icon-tile size-9"><Receipt className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.merchant}</span>
                    <span className="block truncate text-xs text-muted-foreground">{e.category} · {fmt(e.expenseDate)}</span>
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
      </div>
    </AppShell>
  );
}
