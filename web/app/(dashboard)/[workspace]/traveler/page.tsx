import Link from "next/link";
import { Camera, MapPin, Send, AlertTriangle, TrendingUp } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { CreateExpenseDialog } from "@/components/dialogs";
import { HeroStat } from "@/components/ui/hero-stat";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dateObj);
}

export default async function TravelerHomePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const root = `/${workspace}/traveler`;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [trips, expenses, approvals] = await Promise.all([
    api.trips.list({ mine: true }),
    api.expenses.list({ mine: true }),
    api.trips.getApprovals({ mine: true }),
  ]);

  const activeTrip = trips.find((t) => t.status === "active") ?? trips[0];
  const activeApproval = activeTrip ? approvals.find((a) => a.tripId === activeTrip.id) : undefined;
  const tripExpenses = activeTrip ? expenses.filter((e) => e.tripId === activeTrip.id) : [];
  const spent = tripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const recentExpenses = expenses.slice(0, 5);
  const missingReceipts = expenses.filter((e) => !e.receiptFileUrl).length;

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Home" }]}>
      <section className="w-full space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">My travel</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Receipts, expenses, and documents in one place.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`${root}/capture`} className="primary-button rounded-md text-sm">
              <Camera className="size-4" /> Capture
            </Link>
            <CreateExpenseDialog trips={trips} />
          </div>
        </div>

        {/* Hero: current trip */}
        <article className="traveler-web-hero">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary/70">Current trip</p>
            <h2 className="mt-1.5 truncate text-xl font-bold">{activeTrip?.name ?? "No active trip"}</h2>
            {activeTrip ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                <MapPin className="inline size-3 mr-0.5 -mt-0.5" />
                {activeTrip.destination} · {fmt(activeTrip.startDate)} – {fmt(activeTrip.endDate)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Your admin will assign a trip to you.</p>
            )}
          </div>
          {activeTrip && (
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <HeroStat label="Approval" value={activeApproval?.status ?? "Not requested"} highlight={activeApproval?.status === "approved"} />
              <HeroStat label="Spent" value={`${activeTrip.currency} ${spent.toFixed(0)}`} />
            </div>
          )}
        </article>

        {/* Alert: missing receipts */}
        {missingReceipts > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <AlertTriangle className="size-4 shrink-0" />
            <span><strong>{missingReceipts}</strong> expense{missingReceipts === 1 ? "" : "s"} missing receipts — <Link href={`${root}/expenses`} className="underline underline-offset-2">review now</Link></span>
          </div>
        )}

        {/* Request approval CTA */}
        {activeTrip && !activeApproval && (
          <article className="card flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold">Request travel approval</p>
              <p className="text-xs text-muted-foreground">Submit approval for {activeTrip.name}.</p>
            </div>
            <Link href={`${root}/trips/${activeTrip.id}`} className="primary-button shrink-0 rounded-md text-sm">
              <Send className="size-4" /> Request
            </Link>
          </article>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          {/* My trips */}
          <article className="card p-0">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold">My trips</h2>
              {trips.length > 5 && (
                <Link href={`${root}/trips`} className="text-xs font-semibold text-primary hover:underline">All trips</Link>
              )}
            </div>
            <div className="divide-y divide-border/60">
              {trips.slice(0, 5).map((trip) => {
                const approval = approvals.find((a) => a.tripId === trip.id);
                return (
                  <Link key={trip.id} href={`${root}/trips/${trip.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{trip.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{trip.destination} · {fmt(trip.startDate)}</span>
                    </span>
                    <StatusBadge value={approval?.status ?? trip.status} />
                  </Link>
                );
              })}
              {trips.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No assigned trips yet.</p>
              )}
            </div>
          </article>

          {/* Recent expenses */}
          <article className="card p-0">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
              <h2 className="text-sm font-semibold">Recent expenses</h2>
              <Link href={`${root}/expenses`} className="text-xs font-semibold text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border/60">
              {recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <TrendingUp className="size-3" />
                  </span>
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
              {recentExpenses.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No expenses yet.</p>
              )}
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
