import Link from "next/link";
import { Camera, DollarSign } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { CreateExpenseDialog, SubmitExpenseButton } from "@/components/dialogs";
import { apiClient } from "@/lib/api-client";

function fmt(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(dateObj);
}

export default async function TravelerExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trip?: string; error?: string }>;
}) {
  const filters = await searchParams;
  const error = filters.error;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [expenses, trips] = await Promise.all([
    api.expenses.list({ mine: true }),
    api.trips.list({}),
  ]);

  const status = filters.status ?? "all";
  const tripFilter = filters.trip ?? "all";
  const visible = expenses
    .filter((e) => status === "all" || e.status === status)
    .filter((e) => tripFilter === "all" || e.tripId === tripFilter);

  const draftCount = expenses.filter((e) => e.status === "draft").length;

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
            <p className="mt-0.5 text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
              {draftCount > 0 && (
                <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                  · {draftCount} draft{draftCount !== 1 ? "s" : ""} not submitted
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="./capture" className="secondary-button rounded-md text-sm"><Camera className="size-4" /> Capture</Link>
            <CreateExpenseDialog trips={trips} />
          </div>
        </div>

        {/* Draft CTA */}
        {draftCount > 0 && status !== "submitted" && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <span className="flex-1">
              <strong>{draftCount}</strong> draft expense{draftCount === 1 ? "" : "s"} not yet submitted — use the Submit button on each row to send for review.
            </span>
          </div>
        )}

        {/* Expense list */}
        <article className="card p-0">
          <form method="get" className="flex flex-wrap gap-2 border-b border-border p-3">
            <select name="status" defaultValue={status} className="form-control w-auto text-sm">
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="reimbursed">Reimbursed</option>
            </select>
            <select name="trip" defaultValue={tripFilter} className="form-control w-auto text-sm">
              <option value="all">All trips</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button type="submit" className="secondary-button rounded-md text-sm px-3">Filter</button>
          </form>
          <div className="divide-y divide-border/60">
            {visible.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <DollarSign className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.merchant}</span>
                  <span className="block truncate text-xs text-muted-foreground">{fmt(e.expenseDate)} · {e.tripName ?? "No trip"} · {e.category}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-right">
                    <span className="block text-sm font-semibold">{e.currency} {Number(e.amount).toFixed(2)}</span>
                    <StatusBadge value={e.status} />
                  </span>
                  {e.status === "draft" && (
                    <SubmitExpenseButton expenseId={e.id} tripId={e.tripId ?? undefined} />
                  )}
                </span>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No expenses match those filters.</p>
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
