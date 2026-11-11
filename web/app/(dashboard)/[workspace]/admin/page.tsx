import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Map as MapIcon, Plane, Receipt, Wallet } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { EmptyState, PageHeader, SectionCard, Stat } from "@/components/layout/page";
import { CreateTripDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { FlagChips } from "@/components/expense-flags";
import { RouteThumbnail } from "@/components/trips/trip-card";
import { apiClient } from "@/lib/api-client";
import { formatMoney, formatTotals, pick } from "@/lib/expenses";
import { formatDateRange, tripPhase } from "@/lib/trips";

function greeting() {
  const hour = new Date().getUTCHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function AdminOverviewPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const root = `/${workspace}/admin`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const me = await api.auth.me();
  const orgId = me.activeOrganizationId ?? "";
  const [trips, teams, members, approvals, submitted, summary] = await Promise.all([
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.organizations.getMembers(orgId),
    api.trips.getApprovals({ status: "requested" }),
    api.expenses.list({ status: "submitted" }),
    api.expenses.summary(),
  ]);
  const role = me.organizationRole === "manager" ? "manager" : "admin";
  const firstName = (me.name ?? "").split(/[\s@.]/)[0];

  const live = trips
    .map((t) => ({ trip: t, phase: tripPhase(t.startDate, t.endDate) }))
    .filter(({ trip, phase }) => phase.kind !== "past" && trip.status !== "draft" && trip.status !== "archived")
    .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate));
  const ongoing = live.filter((t) => t.phase.kind === "ongoing").length;
  const oldestReview = [...submitted].sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt));

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Overview" }]}>
      <PageHeader
        eyebrow={me.activeOrganizationName}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description={
          submitted.length + approvals.length === 0
            ? "Nothing is waiting on you. Here's what's happening across your trips."
            : `${submitted.length} expense${submitted.length === 1 ? "" : "s"} and ${approvals.length} travel request${approvals.length === 1 ? "" : "s"} are waiting on you.`
        }
        actions={
          <>
            <Link href={`${root}/expenses`} className="secondary-button"><Receipt className="size-4" /> Review expenses</Link>
            <CreateTripDialog teams={teams} travelers={members.map((m) => ({ userId: m.userId, name: m.name || m.email }))} tripHrefBase={`${root}/trips`} />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href={`${root}/expenses`} icon={Receipt} tone="primary" label="To review" value={String(submitted.length)} sub={formatTotals(pick(summary.byCurrency, "pending"), "Nothing pending")} />
        <Stat href={`${root}/expenses?tab=approved`} icon={Wallet} tone="mint" label="Approved, to pay" value={formatTotals(pick(summary.byCurrency, "owed"), "—")} sub="Reimbursable, not paid yet" />
        <Stat href={`${root}/trips`} icon={Plane} tone="warning" label="Travel requests" value={String(approvals.length)} sub={approvals.length ? "Waiting for a decision" : "All decided"} />
        <Stat href={`${root}/trips`} icon={MapIcon} label="Trips under way" value={String(ongoing)} sub={`${live.length - ongoing} coming up`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <SectionCard
            title="Expenses to review"
            description={oldestReview[0] ? `Oldest submitted ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(oldestReview[0].submittedAt ?? oldestReview[0].createdAt))}` : undefined}
            action={<Link href={`${root}/expenses`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open queue <ArrowRight className="size-3.5" /></Link>}
          >
            {oldestReview.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Inbox zero" description="No expenses are waiting for a decision." />
            ) : (
              <ul className="divide-list">
                {oldestReview.slice(0, 6).map((e) => (
                  <li key={e.id}>
                    <Link href={`${root}/expenses`} className="list-row">
                      <span className="avatar">{(e.travelerName ?? "?")[0]?.toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.merchant}</span>
                        <span className="block truncate text-xs text-muted-foreground">{e.travelerName} · {e.category}{e.tripName ? ` · ${e.tripName}` : ""}</span>
                        <FlagChips flags={e.flags} className="mt-1" />
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(e.amount, e.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {approvals.length > 0 && (
            <SectionCard title="Travel requests" description="Approve before people book">
              <ul className="divide-list">
                {approvals.slice(0, 5).map((a) => (
                  <li key={a.id} className="list-row flex-wrap">
                    <span className="avatar">{a.travelerName[0]?.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.travelerName}</span>
                      <Link href={`${root}/trips/${a.tripId}`} className="block truncate text-xs text-muted-foreground hover:text-primary">{a.tripName} · {a.destination}</Link>
                    </span>
                    <ReviewApprovalButtons approvalId={a.id} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <SectionCard
          title="Trips"
          description="Under way and coming up"
          action={<Link href={`${root}/trips`} className="text-sm font-medium text-primary hover:underline">All trips</Link>}
        >
          {live.length === 0 ? (
            <EmptyState icon={MapIcon} title="No upcoming trips" description="Create a trip to assign travelers and plan the route." />
          ) : (
            <ul className="divide-list">
              {live.slice(0, 6).map(({ trip, phase }) => (
                <li key={trip.id}>
                  <Link href={`${root}/trips/${trip.id}`} className="list-row items-start">
                    <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/60">
                      <RouteThumbnail points={trip.routePreview} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{trip.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{trip.routeSummary ?? trip.destination}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {phase.kind === "ongoing" ? <span className="font-medium text-teal-700 dark:text-teal-300">Day {phase.days}</span> : `In ${phase.days} d`}
                        <span>· {formatDateRange(trip.startDate, trip.endDate)}</span>
                      </span>
                    </span>
                    <StatusBadge value={trip.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
