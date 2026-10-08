import Link from "next/link";
import { Camera, Paperclip, Receipt, Undo2 } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import {
  CreateExpenseDialog, DeleteExpenseButton, EditExpenseDialog, SubmitDraftsButton, SubmitExpenseButton,
} from "@/components/dialogs";
import { FlagChips } from "@/components/expense-flags";
import { apiClient } from "@/lib/api-client";
import { formatMoney, formatTotals, pick } from "@/lib/expenses";
import { cn } from "@/lib/utils";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateObj);
}

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Sent back" },
  { key: "submitted", label: "In review" },
  { key: "approved", label: "Approved" },
  { key: "reimbursed", label: "Paid" },
] as const;

export default async function TravelerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trip?: string; error?: string }>;
}) {
  const filters = await searchParams;
  const error = filters.error;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [expenses, trips, summary] = await Promise.all([
    api.expenses.list({ mine: true }),
    api.trips.list({ mine: true }),
    api.expenses.summary(),
  ]);

  const status = filters.status ?? "all";
  const tripFilter = filters.trip ?? "all";
  const visible = expenses
    .filter((e) => status === "all" || e.status === status)
    .filter((e) => tripFilter === "all" || e.tripId === tripFilter);

  const drafts = expenses.filter((e) => e.status === "draft");
  const rejected = expenses.filter((e) => e.status === "rejected");
  const lastCurrency = expenses[0]?.currency;
  const filterHref = (key: string) => {
    const qs = new URLSearchParams();
    if (key !== "all") qs.set("status", key);
    if (tripFilter !== "all") qs.set("trip", tripFilter);
    const str = qs.toString();
    return str ? `?${str}` : "?";
  };

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Expenses" }]}>
      <section className="w-full space-y-5">
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {decodeURIComponent(error)}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Expenses</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Log it, submit it, get paid back.</p>
          </div>
          <div className="flex gap-2">
            <Link href="./capture" className="secondary-button rounded-md text-sm"><Camera className="size-4" /> Capture</Link>
            <CreateExpenseDialog trips={trips} defaultCurrency={lastCurrency} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <MoneyTile label="Owed to you" value={formatTotals(pick(summary.byCurrency, "owed"), "—")} accent />
          <MoneyTile label="In review" value={formatTotals(pick(summary.byCurrency, "pending"), "—")} />
          <MoneyTile label="Paid back" value={formatTotals(pick(summary.byCurrency, "reimbursed"), "—")} />
        </div>

        {rejected.length > 0 && status !== "rejected" && (
          <Link
            href={filterHref("rejected")}
            className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-sm text-rose-800 transition-colors hover:bg-rose-100/80 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
          >
            <Undo2 className="size-4 shrink-0" />
            <span className="flex-1">
              <strong>{rejected.length}</strong> expense{rejected.length === 1 ? " was" : "s were"} sent back. Fix and resubmit to get paid.
            </span>
            <span className="text-xs font-semibold underline underline-offset-2">Review</span>
          </Link>
        )}

        {drafts.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm">
            <span className="flex-1">
              <strong>{drafts.length}</strong> draft{drafts.length === 1 ? "" : "s"} not submitted yet
              <span className="text-muted-foreground"> · {formatTotals(drafts.map((d) => ({ currency: d.currency, amount: Number(d.amount) })))}</span>
            </span>
            <SubmitDraftsButton draftIds={drafts.map((d) => d.id)} />
          </div>
        )}

        <article className="card p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => {
                const count = f.key === "all" ? expenses.length : expenses.filter((e) => e.status === f.key).length;
                if (f.key !== "all" && count === 0) return null;
                return (
                  <Link
                    key={f.key}
                    href={filterHref(f.key)}
                    aria-current={status === f.key ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      status === f.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label} <span className="opacity-60">{count}</span>
                  </Link>
                );
              })}
            </nav>
            {trips.length > 0 && (
              <form method="get" className="ml-auto flex gap-2">
                {status !== "all" && <input type="hidden" name="status" value={status} />}
                <select name="trip" defaultValue={tripFilter} className="form-control w-auto py-1 text-xs" aria-label="Filter by trip">
                  <option value="all">All trips</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="submit" className="secondary-button min-h-8 rounded-md px-3 text-xs">Apply</button>
              </form>
            )}
          </div>

          <div className="divide-y divide-border/60">
            {visible.map((e) => {
              const editable = e.status === "draft" || e.status === "rejected";
              return (
                <div key={e.id} className={cn("flex flex-wrap items-start gap-3 px-4 py-3", e.status === "rejected" && "bg-rose-50/40 dark:bg-rose-400/5")}>
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Receipt className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{e.merchant}</span>
                      {e.receiptFileUrl && (
                        <a href={e.receiptFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary" title="View receipt">
                          <Paperclip className="size-3" />
                        </a>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {fmt(e.expenseDate)} · {e.tripName ?? "No trip"} · {e.category}
                    </span>
                    {editable && <FlagChips flags={e.flags} className="mt-1" />}
                    {e.reviewNote && (
                      <span className={cn("mt-1.5 block text-xs", e.status === "rejected" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground")}>
                        <strong>{e.reviewedByName ?? "Reviewer"}:</strong> {e.reviewNote}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(e.amount, e.currency)}</span>
                    <StatusBadge value={e.status} />
                  </span>
                  {editable && (
                    <span className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:self-center">
                      <EditExpenseDialog expense={e} trips={trips} />
                      {e.status === "draft" && <SubmitExpenseButton expenseId={e.id} tripId={e.tripId} />}
                      <DeleteExpenseButton expenseId={e.id} tripId={e.tripId} />
                    </span>
                  )}
                </div>
              );
            })}
            {visible.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm font-semibold">{expenses.length === 0 ? "No expenses yet" : "Nothing matches these filters"}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {expenses.length === 0 ? "Snap your first receipt — it takes about ten seconds." : "Try another status or trip."}
                </p>
              </div>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function MoneyTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className={cn("card px-3 py-2.5 sm:px-4 sm:py-3", accent && "border-primary/30 bg-primary/5")}>
      <p className="text-[0.7rem] text-muted-foreground sm:text-xs">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums sm:text-base", accent && "text-primary")}>{value}</p>
    </article>
  );
}
