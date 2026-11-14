import { CalendarDays, Info, Receipt, Ticket, Users, Wallet } from "lucide-react";
import type { TripCostsDto } from "@/lib/api-client";
import { formatMoney } from "@/lib/expenses";
import { cn } from "@/lib/utils";

/** Distinct, theme-safe fills for the category breakdown. */
const SLICE_COLORS = ["bg-primary", "bg-teal-500", "bg-amber-500", "bg-violet-500", "bg-sky-500", "bg-rose-500", "bg-subtle"];

/**
 * Everything a trip costs: receipts, confirmed bookings without a receipt yet, and planned
 * estimates; per person and per day; budget; who paid; and, for company trips, reimbursement.
 */
export function TripCostSummary({
  costs,
  company,
  showPeople,
}: {
  costs: TripCostsDto;
  /** Company workspace: show company-paid vs out-of-pocket and reimbursement. */
  company: boolean;
  /** Admins and managers see the per-traveler split. */
  showPeople?: boolean;
}) {
  const c = costs;
  const money = (n: number, compact = false) => formatMoney(n, c.currency, compact ? { compact: true } : undefined);
  const budgetPct = c.budget > 0 ? Math.round((c.total / c.budget) * 100) : 0;
  const committed = c.spent + c.booked;
  const categoryTotal = c.byCategory.reduce((sum, s) => sum + s.amount, 0);
  const slices = c.byCategory.slice(0, 6);
  const rest = c.byCategory.slice(6).reduce((sum, s) => sum + s.amount, 0);
  if (rest > 0) slices.push({ key: "rest", label: "Everything else", amount: rest });

  return (
    <section className="card" aria-labelledby="trip-cost-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="trip-cost-title" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="size-4" /> Trip total
          </h2>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{money(c.total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {money(c.spent)} in receipts
            {c.booked > 0 && <> · {money(c.booked)} booked</>}
            {c.planned > 0 && <> · {money(c.planned)} still to book</>}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end"><Users className="size-3.5" /> Per person</dt>
            <dd className="font-semibold tabular-nums">{money(c.perPerson)}</dd>
            <dd className="text-xs text-muted-foreground">{c.partySize} {c.partySize === 1 ? "person" : "people"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end"><CalendarDays className="size-3.5" /> Per day</dt>
            <dd className="font-semibold tabular-nums">{money(c.perDay)}</dd>
            <dd className="text-xs text-muted-foreground">{c.days} {c.days === 1 ? "day" : "days"}</dd>
          </div>
        </dl>
      </div>

      {c.budget > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">Budget {money(c.budget)}</span>
            <span className={cn("tabular-nums", c.remaining < 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
              {c.remaining < 0 ? `${money(-c.remaining)} over` : `${money(c.remaining)} left`}
            </span>
          </div>
          <div
            className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${budgetPct}% of budget used: ${money(committed)} committed, ${money(c.planned)} planned`}
          >
            <span className={cn("h-full", budgetPct > 100 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, (committed / c.budget) * 100)}%` }} />
            {c.planned > 0 && (
              <span className="h-full bg-primary/35" style={{ width: `${Math.max(0, Math.min(100 - (committed / c.budget) * 100, (c.planned / c.budget) * 100))}%` }} />
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{budgetPct}% used{c.planned > 0 ? ", including planned bookings" : ""}</p>
        </div>
      )}

      {slices.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">Where it goes</h3>
          <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {slices.map((s, i) => (
              <span key={s.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", SLICE_COLORS[i % SLICE_COLORS.length])} style={{ width: `${(s.amount / categoryTotal) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {slices.map((s, i) => (
              <li key={s.key} className="flex min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-sm", SLICE_COLORS[i % SLICE_COLORS.length])} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round((s.amount / categoryTotal) * 100)}%</span>
                <span className="w-24 text-right font-medium tabular-nums">{money(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-3">
        <Fact icon={Receipt} label="Receipts" value={String(c.receiptCount)} />
        <Fact
          icon={Ticket}
          label="Bookings"
          value={String(c.bookingCount)}
          sub={c.bookingsWithoutReceipt > 0 ? `${c.bookingsWithoutReceipt} without a receipt` : c.bookingCount > 0 ? "All have receipts" : undefined}
          warn={c.bookingsWithoutReceipt > 0}
        />
        {company ? (
          <Fact icon={Wallet} label="Paid by you" value={money(c.paidPersonally)} sub={`${money(c.paidByCompany)} paid by the company`} />
        ) : (
          <Fact icon={Users} label="Party" value={`${c.partySize} ${c.partySize === 1 ? "person" : "people"}`} />
        )}
      </div>

      {company && c.reimbursementPending + c.reimbursementOwed + c.reimbursed > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-xs">
          <div><dt className="text-muted-foreground">In review</dt><dd className="mt-0.5 font-semibold tabular-nums">{money(c.reimbursementPending)}</dd></div>
          <div><dt className="text-muted-foreground">Approved, to pay</dt><dd className="mt-0.5 font-semibold tabular-nums">{money(c.reimbursementOwed)}</dd></div>
          <div><dt className="text-muted-foreground">Reimbursed</dt><dd className="mt-0.5 font-semibold tabular-nums">{money(c.reimbursed)}</dd></div>
        </dl>
      )}

      {showPeople && c.byPerson.length > 1 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">Receipts by traveler</h3>
          <ul className="mt-2 divide-y divide-border/60 text-sm">
            {c.byPerson.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate">{p.label}</span>
                <span className="font-medium tabular-nums">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.otherCurrencies.length > 0 && (
        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Not included above (not converted):{" "}
            {c.otherCurrencies.map((o) => formatMoney(o.amount, o.key)).join(" · ")}
          </span>
        </p>
      )}
    </section>
  );
}

function Fact({
  icon: Icon, label, value, sub, warn,
}: { icon: typeof Receipt; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="icon-tile size-8"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold tabular-nums">{value}</p>
        {sub && <p className={cn("text-xs", warn ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>{sub}</p>}
      </div>
    </div>
  );
}
