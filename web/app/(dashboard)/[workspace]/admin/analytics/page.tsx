import { BarChart3, DollarSign, MapPin, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dateObj);
}

function money(n: number, currency = "USD") {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(1)}k`;
  return `${currency} ${n.toFixed(0)}`;
}

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const api = apiClient({ cookie: (await cookies()).toString() });

  const [overview, trips, approvals, expenses] = await Promise.all([
    api.analytics.overview(),
    api.trips.list({}),
    api.trips.getApprovals({}),
    api.expenses.list({}),
  ]);

  const budgetUtil = (overview as any)?.totalBudget > 0
    ? Math.round((((overview as any)?.totalSpend || 0) / (overview as any).totalBudget) * 100)
    : 0;

  const recentTrips = trips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  const pendingApprovals = approvals.filter((a) => a.status === "requested").length;
  const submittedExpenses = expenses.filter((e) => e.status === "submitted").length;

  return (
    <AppShell role="admin" breadcrumbs={[{ label: "Analytics" }]}>
      <section className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Spend, approvals, and team performance at a glance.</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="size-3.5" /> Live data
          </span>
        </div>

        {/* KPI overview */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard icon={<DollarSign className="size-4" />} label="Total approved spend" value={money((overview as any)?.totalSpend || 0)} sub={`${budgetUtil}% of budget used`} color="primary" />
          <KpiCard icon={<MapPin className="size-4" />} label="Total trips" value={String(trips.length)} sub={`${(overview as any)?.totalBudget > 0 ? money((overview as any).totalBudget) : "—"} combined budget`} color="primary" />
          <KpiCard icon={<Users className="size-4" />} label="Members" value={String((overview as any)?.totalMembers || 0)} sub="across organization" color="primary" />
          <KpiCard icon={<ShieldCheck className="size-4" />} label="Pending approvals" value={String(pendingApprovals)} sub="trip requests" color={pendingApprovals > 0 ? "amber" : "primary"} />
          <KpiCard icon={<TrendingUp className="size-4" />} label="Expenses to review" value={String(submittedExpenses)} sub="awaiting decision" color={submittedExpenses > 0 ? "blue" : "primary"} />
          <div className="card flex flex-col justify-between">
            <p className="text-xs text-muted-foreground">Budget utilization</p>
            <p className="mt-1 text-2xl font-bold">{budgetUtil}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${budgetUtil >= 100 ? "bg-rose-500" : budgetUtil >= 80 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, budgetUtil)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{money((overview as any)?.totalSpend || 0)} of {money((overview as any)?.totalBudget || 0)}</p>
          </div>
        </div>

        {/* Recent trips table */}
        <article className="card p-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-border/60">
            <h2 className="text-sm font-semibold">Recent trips</h2>
            <span className="text-xs text-muted-foreground">{recentTrips.length} trips</span>
          </div>
          <div className="divide-y divide-border/60">
            {recentTrips.map((trip) => {
              const spent = 0; // TODO: Calculate from expenses when available
              const pct = trip.budget > 0 ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;
              return (
                <div key={trip.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-semibold">{trip.name}</p>
                        <StatusBadge value={trip.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trip.destination} · {fmt(trip.startDate)} – {fmt(trip.endDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{money(spent)}</p>
                      <p className="text-xs text-muted-foreground">of {money(trip.budget)}</p>
                    </div>
                  </div>
                  {trip.budget > 0 && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {recentTrips.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No trips yet.</p>
            )}
          </div>
        </article>
        {/* Top spenders section removed - not available in current API */}
      </section>
    </AppShell>
  );
}

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "primary" | "amber" | "blue";
}) {
  const iconCls =
    color === "amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" :
    color === "blue" ? "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300" :
    "bg-primary/10 text-primary";
  return (
    <article className="card">
      <div className={`mb-2.5 flex size-8 items-center justify-center rounded-lg ${iconCls}`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[0.7rem] text-muted-foreground">{sub}</p>
    </article>
  );
}
