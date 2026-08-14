import { notFound } from "next/navigation";
import {
  CalendarDays, CheckCircle2, Clock, ImageOff, MapPin, Users, XCircle,
} from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge, type BreadcrumbItem } from "@/components/layout/navigation";
import { AssignTravelersDialog, InviteMemberDialog, ReviewApprovalButtons } from "@/components/dialogs";
import { ExpenseTable, type CommentRow } from "@/components/expense-table";
import { HeroStat } from "@/components/ui/hero-stat";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateObj);
}

function daysLabel(start: string | Date, end: string | Date) {
  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  const now = new Date();
  const totalMs = endDate.getTime() - startDate.getTime();
  const totalDays = Math.max(1, Math.ceil(totalMs / 86_400_000));
  if (now < startDate) {
    const inDays = Math.ceil((startDate.getTime() - now.getTime()) / 86_400_000);
    return { label: `Starts in ${inDays}d`, kind: "upcoming" as const };
  }
  if (now > endDate) {
    return { label: `${totalDays}d trip (ended)`, kind: "ended" as const };
  }
  const elapsed = Math.ceil((now.getTime() - startDate.getTime()) / 86_400_000);
  return { label: `Day ${elapsed} of ${totalDays}`, kind: "active" as const };
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
  const orgId = currentUser.activeOrganizationId || workspace;

  const trip = await api.trips.getById(tripId).catch(() => null);
  if (!trip) return notFound();

  const [expenses, members, travelers, approvals, allTrips, allTeams, tripComments] = await Promise.all([
    api.expenses.list({ tripId }),
    api.organizations.getMembers(orgId),
    api.trips.getTravelers(tripId),
    api.trips.getApprovals({ tripId }),
    api.trips.list({}),
    api.organizations.getTeams(orgId),
    api.comments.listForTrip(tripId),
  ]);
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";

  const assignedUserIds = travelers.map((t) => t.userId);

  // Budget & spend
  const spent = expenses
    .filter((e) => ["approved", "reimbursed", "submitted"].includes(e.status))
    .reduce((s, e) => s + Number(e.amount), 0);
  const approvedSpend = expenses
    .filter((e) => ["approved", "reimbursed"].includes(e.status))
    .reduce((s, e) => s + Number(e.amount), 0);
  const budget = Number(trip.budget);
  const budgetPct = budget > 0 ? Math.min(100, Math.round((approvedSpend / budget) * 100)) : 0;

  // Admins only see submitted-and-above expenses (drafts are internal to travelers)
  const reviewableExpenses = expenses.filter((e) => e.status !== "draft");
  const pendingExpenses = reviewableExpenses.filter((e) => e.status === "submitted");
  const missingReceipts = reviewableExpenses.filter((e) => !e.receiptFileUrl).length;
  const pendingApprovals = approvals.filter((a) => a.status === "requested");
  const dayInfo = daysLabel(trip.startDate, trip.endDate);

  // Group comments by expenseId
  const commentsByExpense = tripComments.reduce<Record<string, CommentRow[]>>((acc, c) => {
    if (!acc[c.expenseId]) acc[c.expenseId] = [];
    acc[c.expenseId].push({ ...c, createdAt: new Date(c.createdAt) });
    return acc;
  }, {});

  // Reimbursement summary
  const reimbursableByTraveler = reviewableExpenses
    .filter((e) => e.reimbursable && ["approved", "reimbursed"].includes(e.status))
    .reduce<Record<string, { name: string; total: number; currency: string; reimbursed: number }>>((acc, e) => {
      const member = members.find((m) => m.userId === e.userId);
      const key = e.userId;
      if (!acc[key]) acc[key] = { name: member?.name ?? "Unknown", total: 0, currency: e.currency, reimbursed: 0 };
      acc[key].total += Number(e.amount);
      if (e.status === "reimbursed") acc[key].reimbursed += Number(e.amount);
      return acc;
    }, {});
  const reimbursementRows = Object.values(reimbursableByTraveler);

  const tripTeam = allTeams.find((t) => t.id === trip.teamId);

  const breadcrumbs: BreadcrumbItem[] = [
    ...(tripTeam
      ? [
          {
            label: tripTeam.name,
            href: `${adminRoot}/groups/${tripTeam.id}`,
            items: allTeams
              .filter((t) => t.id !== tripTeam.id)
              .map((t) => ({ label: t.name, href: `${adminRoot}/groups/${t.id}` })),
            addHref: `${adminRoot}/settings`,
            addLabel: "New group",
          },
        ]
      : [{ label: "Trips", href: adminRoot }]),
    {
      label: trip.name,
      items: allTrips
        .filter((t) => t.id !== trip.id && t.teamId === trip.teamId)
        .map((t) => ({ label: t.name, href: `${adminRoot}/trips/${t.id}` })),
      addHref: adminRoot,
      addLabel: "New trip",
    },
  ];

  return (
    <AppShell role={role} breadcrumbs={breadcrumbs}>
      <div className="w-full space-y-5">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <article className="trip-detail-hero">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge value={trip.status} />
              {tripTeam && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Users className="size-3" /> {tripTeam.name}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold leading-tight">{trip.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-primary/70" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5 text-primary/70" />
                {fmt(trip.startDate)} – {fmt(trip.endDate)}
              </span>
              <span
                className={
                  dayInfo.kind === "active"
                    ? "font-medium text-teal-600 dark:text-teal-400"
                    : dayInfo.kind === "upcoming"
                    ? "font-medium text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground"
                }
              >
                <Clock className="mr-0.5 inline size-3 -mt-0.5" />
                {dayInfo.label}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <HeroStat label="Budget" value={`${trip.currency} ${budget.toLocaleString()}`} />
            <HeroStat
              label="Approved spend"
              value={`${trip.currency} ${approvedSpend.toFixed(0)}`}
              highlight={approvedSpend > budget && budget > 0 ? "over" : undefined}
            />
            <HeroStat label="Travelers" value={String(travelers.length)} />
            {pendingApprovals.length > 0 && (
              <HeroStat label="Pending approvals" value={String(pendingApprovals.length)} highlight="warn" />
            )}
          </div>
        </article>

        {/* ── Budget progress ────────────────────────────────────────────── */}
        {budget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Budget · {trip.currency} {approvedSpend.toFixed(0)} approved of {budget.toLocaleString()}
                {spent > approvedSpend && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    +{trip.currency} {(spent - approvedSpend).toFixed(0)} pending
                  </span>
                )}
              </span>
              <span className={budgetPct >= 90 ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>{budgetPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetPct >= 100 ? "bg-rose-500" : budgetPct >= 80 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Two-column grid ────────────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">

          {/* ── Left: Expense review ────────────────────────────────────── */}
          <article className="card p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-0">
              <h2 className="text-base font-semibold">Expense review</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {pendingExpenses.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    {pendingExpenses.length} pending
                  </span>
                )}
                {missingReceipts > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
                    <ImageOff className="mr-0.5 inline size-3" />{missingReceipts} no receipt
                  </span>
                )}
              </div>
            </div>
            <ExpenseTable
              expenses={reviewableExpenses.map((e) => ({
                ...e,
                expenseDate: new Date(e.expenseDate),
              }))}
              showTraveler
              showReview
              tripId={tripId}
              defaultTab={pendingExpenses.length > 0 ? "submitted" : "all"}
              emptyMessage="No submitted expenses on this trip yet."
              comments={commentsByExpense}
            />
          </article>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Travel approvals */}
            <article className="card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Travel approvals</h2>
                {pendingApprovals.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                    {pendingApprovals.length} pending
                  </span>
                )}
              </div>

              {approvals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No approval requests yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...approvals].sort((a, b) =>
                    a.status === "requested" ? -1 : b.status === "requested" ? 1 : 0
                  ).map((approval) => (
                    <div
                      key={approval.id}
                      className={`rounded-lg border p-3 ${
                        approval.status === "requested"
                          ? "border-amber-200 bg-amber-50/50 dark:border-amber-400/20 dark:bg-amber-400/5"
                          : approval.status === "approved"
                          ? "border-teal-200 bg-teal-50/30 dark:border-teal-400/15 dark:bg-teal-400/5"
                          : approval.status === "rejected"
                          ? "border-rose-200 bg-rose-50/30 dark:border-rose-400/15 dark:bg-rose-400/5"
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                            {approval.travelerName.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{approval.travelerName}</p>
                            {approval.decidedAt && (
                              <p className="text-xs text-muted-foreground">
                                {approval.status === "approved" ? "Approved" : "Decided"} {fmt(approval.decidedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <StatusBadge value={approval.status} />
                      </div>

                      {approval.purpose && (
                        <p className="mt-2 text-xs font-medium text-foreground/80">{approval.purpose}</p>
                      )}
                      {approval.notes && (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{approval.notes}</p>
                      )}
                      <p className="mt-1.5 text-[0.65rem] text-muted-foreground/60">
                        Requested {fmt(approval.createdAt)}
                      </p>

                      {approval.status === "requested" && (
                        <div className="mt-2.5 border-t border-border/50 pt-2.5">
                          <ReviewApprovalButtons approvalId={approval.id} />
                        </div>
                      )}

                      {approval.status === "approved" && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                          <CheckCircle2 className="size-3.5" /> Approved for this trip
                        </div>
                      )}
                      {approval.status === "rejected" && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                          <XCircle className="size-3.5" /> Request rejected
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>

            {/* Assigned travelers */}
            <article className="card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Travelers</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {travelers.length} assigned
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {role === "admin" && <InviteMemberDialog compact />}
                  <AssignTravelersDialog
                    tripId={trip.id}
                    travelers={members.filter((m) => m.role === "traveler")}
                    assignedIds={assignedUserIds}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                {travelers.map((t) => {
                  const approval = approvals.find((ap) => ap.userId === t.userId);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-2"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {t.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{t.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{t.email}</span>
                      </span>
                      {approval && <StatusBadge value={approval.status} />}
                    </div>
                  );
                })}
                {travelers.length === 0 && (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    No travelers assigned yet.
                  </p>
                )}
              </div>
            </article>

            {/* Reimbursement summary */}
            {reimbursementRows.length > 0 && (
              <article className="card">
                <h2 className="mb-3 text-base font-semibold">Reimbursement summary</h2>
                <div className="space-y-2">
                  {reimbursementRows.map((row) => {
                    const pending = row.total - row.reimbursed;
                    const done = pending < 0.01;
                    return (
                      <div key={row.name} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {row.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{row.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {row.currency} {row.total.toFixed(2)} total
                            {row.reimbursed > 0 && ` · ${row.currency} ${row.reimbursed.toFixed(2)} reimbursed`}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          done
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                        }`}>
                          {done ? "Done" : `${row.currency} ${pending.toFixed(2)} due`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            )}

            {/* Trip info */}
            <article className="card">
              <h2 className="mb-3 text-base font-semibold">Trip info</h2>
              <dl className="space-y-2 text-sm">
                <InfoRow label="Status" value={<StatusBadge value={trip.status} />} />
                <InfoRow label="Group" value={tripTeam?.name ?? "—"} />
                <InfoRow label="Currency" value={trip.currency} />
                <InfoRow label="Budget" value={`${trip.currency} ${budget.toLocaleString()}`} />
                <InfoRow label="Starts" value={fmt(trip.startDate)} />
                <InfoRow label="Ends" value={fmt(trip.endDate)} />
              </dl>
            </article>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
