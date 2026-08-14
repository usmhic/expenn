import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, FileText, ReceiptText } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { RequestApprovalDialog } from "@/components/dialogs";
import { HeroStat } from "@/components/ui/hero-stat";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateObj);
}

export default async function TravelerTripDetailPage({ params }: { params: Promise<{ workspace: string; tripId: string }> }) {
  const { workspace, tripId } = await params;
  const root = `/${workspace}/traveler`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const trip = await api.trips.getById(tripId).catch(() => null);
  if (!trip) return notFound();

  const [expenses, allDocuments, approvals, allTrips, currentUser, travelers] = await Promise.all([
    api.expenses.list({ tripId, mine: true }),
    api.documents.list({}),
    api.trips.getApprovals({ tripId, mine: true }),
    api.trips.list({ mine: true }),
    api.auth.me(),
    api.trips.getTravelers(tripId),
  ]);

  const documents = allDocuments.filter((d) => d.tripId === tripId);
  const approval = approvals[0];
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const canRequestApproval = !approval || approval.status === "rejected" || approval.status === "cancelled";
  const isAssigned = travelers.some((t) => t.userId === currentUser.id);

  const tripBreadcrumbs = [
    { label: "Trips", href: root },
    {
      label: trip.name,
      items: allTrips.filter((t) => t.id !== trip.id).map((t) => ({
        label: t.name,
        href: `${root}/trips/${t.id}`,
      })),
    },
  ];

  const budget = Number(trip.budget);
  const budgetPct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const budgetOver = total > budget && budget > 0;

  return (
    <AppShell role="traveler" breadcrumbs={tripBreadcrumbs}>
      <section className="w-full space-y-5">
        {/* Hero */}
        <article className="trip-detail-hero">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge value={trip.status} />
              {approval && <StatusBadge value={approval.status} />}
            </div>
            <h1 className="text-xl font-bold">{trip.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{trip.destination} · {fmt(trip.startDate)} – {fmt(trip.endDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <HeroStat label="Budget" value={`${trip.currency} ${budget.toFixed(0)}`} />
            <HeroStat label="Spent" value={`${trip.currency} ${total.toFixed(0)}`} highlight={budgetOver} />
          </div>
        </article>

        {/* Budget bar */}
        {budget > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Budget used</span>
              <span className={budgetOver ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>{budgetPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${budgetOver ? "bg-rose-500" : "bg-primary"}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Approval */}
        <article className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Travel approval</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {approval
                  ? approval.status === "approved"
                    ? "Your travel has been approved."
                    : approval.status === "rejected"
                      ? "Your request was rejected — you can re-submit."
                      : "Your request is under review."
                  : isAssigned
                    ? "Request approval before your trip starts."
                    : "You are not assigned to this trip."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {approval && <StatusBadge value={approval.status} />}
              {canRequestApproval && isAssigned && <RequestApprovalDialog tripId={trip.id} />}
            </div>
          </div>
          {approval && !canRequestApproval && (
            <p className="mt-3 rounded-md border border-border bg-secondary/55 p-3 text-sm text-muted-foreground">
              Requested on {fmt(approval.createdAt)}{approval.purpose ? ` — ${approval.purpose}` : ""}.
            </p>
          )}
        </article>

        {/* Expenses */}
        <article className="card p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div>
              <h2 className="text-base font-semibold">Expenses</h2>
              <p className="text-xs text-muted-foreground">
                {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · {trip.currency} {total.toFixed(2)} total
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`${root}/capture`} className="secondary-button rounded-md text-sm">
                <Camera className="size-4" /> Capture
              </Link>
              <Link href={`${root}/expenses`} className="secondary-button rounded-md text-sm">
                <ReceiptText className="size-4" /> All expenses
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border/70">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.merchant}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.category} · {fmt(e.expenseDate)}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-sm font-semibold">{e.currency} {Number(e.amount).toFixed(2)}</span>
                  <StatusBadge value={e.status} />
                </span>
              </div>
            ))}
            {expenses.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No expenses on this trip yet.</p>}
          </div>
        </article>

        {/* Documents */}
        <article className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold">Documents</h2>
            <Link href={`${root}/documents`} className="text-xs font-semibold text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Link key={doc.id} href={`${root}/documents/${doc.id}`} className="flex items-center gap-2.5 rounded-md border border-border p-2.5 text-sm hover:bg-secondary/55 transition-colors">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                <StatusBadge value={doc.kind} />
              </Link>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents attached to this trip.</p>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
