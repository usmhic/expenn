import Link from "next/link";
import { AlertTriangle, Clock, Receipt, Timer, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { apiClient, type AnalyticsOverviewDto } from "@/lib/api-client";
import { formatMoney } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function formatDuration(hours?: number | null) {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return "< 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ year?: string; currency?: string }>;
}) {
  const [{ workspace }, filters] = await Promise.all([params, searchParams]);
  const year = Number(filters.year) || new Date().getFullYear();
  const api = apiClient({ cookie: (await cookies()).toString() });
  const overview: AnalyticsOverviewDto = await api.analytics.overview({ year });

  // Money is never summed across currencies: the page shows one currency at a time.
  const currencies = overview.byCurrency.map((c) => c.currency);
  const currency = currencies.includes(filters.currency ?? "") ? filters.currency! : currencies[0] ?? "USD";
  const totals = overview.byCurrency.find((c) => c.currency === currency);
  const categories = overview.byCategory.filter((c) => c.currency === currency).slice(0, 8);
  const months = MONTHS.map((label, i) => ({
    label,
    amount: overview.byMonth.find((m) => m.month === i + 1 && m.currency === currency)?.amount ?? 0,
  }));
  const spenders = overview.topSpenders.filter((s) => s.currency === currency);
  const trips = overview.trips.filter((t) => t.currency === currency).slice(0, 10);
  const budgetPct = totals && totals.budget > 0 ? Math.round((totals.approved / totals.budget) * 100) : null;
  const root = `/${workspace}/admin/analytics`;
  const href = (next: { year?: number; currency?: string }) =>
    `${root}?year=${next.year ?? year}&currency=${next.currency ?? currency}`;

  return (
    <AppShell role="admin" breadcrumbs={[{ label: "Analytics" }]}>
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Where the money goes, and how fast people get paid back.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filters">
            <Link href={href({ year: year - 1 })} className="secondary-button min-h-8 rounded-md px-2.5 text-xs" aria-label="Previous year">‹</Link>
            <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{year}</span>
            <Link href={href({ year: year + 1 })} className="secondary-button min-h-8 rounded-md px-2.5 text-xs" aria-label="Next year">›</Link>
            {currencies.length > 1 && (
              <span className="ml-2 flex gap-1">
                {currencies.map((c) => (
                  <Link
                    key={c}
                    href={href({ currency: c })}
                    aria-current={c === currency ? "true" : undefined}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      c === currency ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c}
                  </Link>
                ))}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Approved spend" value={formatMoney(totals?.approved ?? 0, currency, { compact: true })}
            sub={totals?.pending ? `+ ${formatMoney(totals.pending, currency, { compact: true })} waiting for review` : "Nothing waiting for review"} />
          <StatTile label="Budget used" value={budgetPct === null ? "—" : `${budgetPct}%`}
            sub={totals && totals.budget > 0 ? `of ${formatMoney(totals.budget, currency, { compact: true })} across ${trips.length} trip${trips.length === 1 ? "" : "s"}` : "No trip budgets set"}
            status={budgetPct !== null && budgetPct > 100 ? "Over budget" : undefined} />
          <StatTile icon={<Timer className="size-3.5" />} label="Time to decision" value={formatDuration(overview.avgHoursToReview)} sub="Average, submit → approve/reject" />
          <StatTile icon={<Clock className="size-3.5" />} label="Time to reimburse" value={overview.avgDaysToReimburse == null ? "—" : `${overview.avgDaysToReimburse} days`} sub="Average, submit → paid" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="card">
            <h2 className="text-sm font-semibold">Monthly spend</h2>
            <p className="text-xs text-muted-foreground">Submitted and approved expenses, {currency}</p>
            <MonthChart months={months} currency={currency} />
          </article>

          <article className="card">
            <h2 className="text-sm font-semibold">By category</h2>
            <p className="mb-3 text-xs text-muted-foreground">Top categories, {currency}</p>
            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No spend recorded for {year}.</p>
            ) : (
              <ul className="space-y-2.5">
                {categories.map((c) => (
                  <li key={c.category} title={`${c.category}: ${formatMoney(c.amount, currency)} across ${c.count} expense${c.count === 1 ? "" : "s"}`}>
                    <div className="mb-1 flex justify-between gap-3 text-xs">
                      <span className="truncate font-medium">{c.category}</span>
                      <span className="tabular-nums text-muted-foreground">{formatMoney(c.amount, currency)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (c.amount / categories[0].amount) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article className="card p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 pb-2 pt-4">
              <h2 className="text-sm font-semibold">Trips against budget</h2>
              <span className="text-xs text-muted-foreground">Approved · pending</span>
            </div>
            <div className="divide-y divide-border/60">
              {trips.map((trip) => {
                const pct = trip.budget > 0 ? Math.round((trip.approved / trip.budget) * 100) : null;
                const pendingPct = trip.budget > 0 ? (trip.pending / trip.budget) * 100 : 0;
                const over = pct !== null && pct > 100;
                return (
                  <Link key={trip.tripId} href={`/${workspace}/admin/trips/${trip.tripId}`} className="block px-4 py-3 transition-colors hover:bg-secondary/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{trip.name}</p>
                          <StatusBadge value={trip.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{trip.destination} · {fmt(trip.startDate)} – {fmt(trip.endDate)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{formatMoney(trip.approved, currency, { compact: true })}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.budget > 0 ? `of ${formatMoney(trip.budget, currency, { compact: true })}` : "no budget"}
                        </p>
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-secondary" title={`${pct}% approved${trip.pending ? `, ${formatMoney(trip.pending, currency)} pending` : ""}`}>
                          <div className={cn("h-full rounded-full", over ? "bg-rose-500" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
                          {pendingPct > 0 && pct < 100 && (
                            <div className="h-full rounded-full bg-primary/30" style={{ width: `${Math.min(100 - pct, pendingPct)}%` }} />
                          )}
                        </div>
                        <span className={cn("w-20 text-right text-xs tabular-nums", over ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          {over && <AlertTriangle className="mr-0.5 inline size-3 -mt-0.5" />}{pct}%{over ? " over" : ""}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
              {trips.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No trips in {year}.</p>}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="card">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Users className="size-3.5" /> Top spenders</h2>
              {spenders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spend yet.</p>
              ) : (
                <ol className="space-y-2">
                  {spenders.map((s, i) => (
                    <li key={s.userId} className="flex items-center gap-2.5 text-sm">
                      <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatMoney(s.amount, currency, { compact: true })}</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
            <article className="card">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Receipt className="size-3.5" /> Hygiene</h2>
              <dl className="space-y-1.5 text-sm">
                <Row label="Expenses this year" value={String(overview.expenseCount)} />
                <Row label="Missing receipts" value={String(overview.missingReceipts)} warn={overview.missingReceipts > 0} />
                <Row label="Trips" value={String(overview.tripCount)} />
                <Row label="Members" value={String(overview.memberCount)} />
              </dl>
            </article>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

function StatTile({ label, value, sub, icon, status }: { label: string; value: string; sub: string; icon?: React.ReactNode; status?: string }) {
  return (
    <article className="card">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {status && (
        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[0.7rem] font-medium text-rose-800 dark:bg-rose-400/15 dark:text-rose-200">
          <AlertTriangle className="size-3" /> {status}
        </p>
      )}
      <p className="mt-1 text-[0.7rem] text-muted-foreground">{sub}</p>
    </article>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", warn && "text-amber-700 dark:text-amber-300")}>{value}</dd>
    </div>
  );
}

/** Single-series column chart: one hue, thin columns, hover title per month, peak labelled. */
function MonthChart({ months, currency }: { months: { label: string; amount: number }[]; currency: string }) {
  const max = Math.max(...months.map((m) => m.amount));
  if (max <= 0) return <p className="py-12 text-center text-sm text-muted-foreground">No spend recorded yet.</p>;
  const peak = months.findIndex((m) => m.amount === max);
  return (
    <figure className="mt-4">
      <div className="flex h-40 items-end gap-1.5 border-b border-border" role="img" aria-label={`Monthly spend in ${currency}, peak ${months[peak].label} at ${formatMoney(max, currency)}`}>
        {months.map((m, i) => (
          <div key={m.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${m.label}: ${formatMoney(m.amount, currency)}`}>
            {i === peak && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.65rem] font-medium tabular-nums text-muted-foreground">
                {formatMoney(m.amount, currency, { compact: true })}
              </span>
            )}
            <div
              className="mx-auto w-full max-w-6 rounded-t bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: m.amount > 0 ? `${Math.max(2, (m.amount / max) * 85)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {months.map((m) => (
          <span key={m.label} className="flex-1 text-center text-[0.6rem] text-muted-foreground">{m.label.slice(0, 1)}<span className="hidden sm:inline">{m.label.slice(1)}</span></span>
        ))}
      </div>
      <figcaption className="sr-only">
        <table>
          <tbody>{months.map((m) => <tr key={m.label}><th>{m.label}</th><td>{formatMoney(m.amount, currency)}</td></tr>)}</tbody>
        </table>
      </figcaption>
    </figure>
  );
}
