"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Check, ImageOff, Paperclip, Sparkles, X } from "lucide-react";
import { bulkReviewExpensesAction, type DialogState } from "@/app/dialog-actions";
import { ReviewDialog, ReviewExpenseButtons } from "@/components/dialogs";
import { FlagChips } from "@/components/expense-flags";
import { StatusBadge } from "@/components/layout/navigation";
import type { ExpenseDto } from "@/lib/api-client";
import { formatMoney, formatTotals, totalsByCurrency } from "@/lib/expenses";
import { cn } from "@/lib/utils";

function fmtDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

/**
 * Finance's inbox: select many, decide once. Bulk actions only offer the transition
 * that is valid for the current tab, so a pay run can never touch unapproved items.
 */
export function ReviewQueue({ expenses, tab }: { expenses: ExpenseDto[]; tab: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<"approved" | "rejected" | "reimbursed" | null>(null);
  const [state, action] = useActionState(bulkReviewExpensesAction, null as DialogState);

  const bulkStatus = tab === "submitted" ? "submitted" : tab === "approved" ? "approved" : null;
  const selectable = bulkStatus ? expenses.filter((e) => e.status === bulkStatus) : [];
  const clean = selectable.filter((e) => (e.flags ?? []).length === 0);
  const selectedExpenses = useMemo(() => expenses.filter((e) => selected.has(e.id)), [expenses, selected]);
  const allSelected = selectable.length > 0 && selectable.every((e) => selected.has(e.id));

  useEffect(() => {
    if (!state?.success) return;
    startTransition(() => {
      setOpen(null);
      setSelected(new Set());
    });
    router.refresh();
    toast.success(state.message ?? "Done.");
  }, [state, router]);

  useEffect(() => {
    startTransition(() => setSelected(new Set()));
  }, [tab]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (expenses.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
          <Check className="size-5" />
        </span>
        <p className="text-sm font-semibold">Nothing here</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {tab === "submitted" ? "You're all caught up — no expenses waiting for a decision." : "No expenses in this view yet."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {bulkStatus && (
        <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2">
          {selected.size > 0 ? (
            <>
              <span className="text-sm font-semibold">{selected.size} selected</span>
              <span className="text-sm text-muted-foreground">· {formatTotals(totalsByCurrency(selectedExpenses))}</span>
              <span className="flex-1" />
              {bulkStatus === "submitted" ? (
                <>
                  <button type="button" onClick={() => setOpen("rejected")} className="secondary-button min-h-8 rounded-md px-3 text-xs text-rose-600 dark:text-rose-400">
                    <X className="size-3.5" /> Send back
                  </button>
                  <button type="button" onClick={() => setOpen("approved")} className="primary-button min-h-8 rounded-md px-3 text-xs">
                    <Check className="size-3.5" /> Approve {selected.size}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setOpen("reimbursed")} className="primary-button min-h-8 rounded-md px-3 text-xs">
                  <Banknote className="size-3.5" /> Mark {selected.size} paid
                </button>
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                Clear
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                {bulkStatus === "submitted" ? "Select expenses to approve or send back together." : "Select expenses you've paid out."}
              </span>
              <span className="flex-1" />
              {bulkStatus === "submitted" && clean.length > 0 && clean.length < selectable.length && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set(clean.map((e) => e.id)))}
                  className="secondary-button min-h-8 rounded-md px-3 text-xs"
                  title="Select every expense with a receipt and no duplicate warning"
                >
                  <Sparkles className="size-3.5" /> Select {clean.length} without issues
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs font-semibold text-muted-foreground">
              {bulkStatus && (
                <th className="w-10 py-2.5 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((e) => e.id)))}
                    className="size-4 rounded accent-primary"
                  />
                </th>
              )}
              <th className={cn("py-2.5 pr-3", !bulkStatus && "pl-4")}>Expense</th>
              <th className="hidden px-3 py-2.5 md:table-cell">Traveler</th>
              <th className="hidden px-3 py-2.5 lg:table-cell">Trip</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="hidden px-3 py-2.5 sm:table-cell">Status</th>
              <th className="px-3 py-2.5 text-center"><span className="sr-only">Receipt</span></th>
              <th className="py-2.5 pl-3 pr-4"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {expenses.map((e) => {
              const isSelectable = bulkStatus !== null && e.status === bulkStatus;
              return (
                <tr key={e.id} className={cn("align-top transition-colors hover:bg-secondary/40", selected.has(e.id) && "bg-primary/5")}>
                  {bulkStatus && (
                    <td className="py-3 pl-4">
                      {isSelectable && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${e.merchant}`}
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          className="size-4 rounded accent-primary"
                        />
                      )}
                    </td>
                  )}
                  <td className={cn("py-3 pr-3", !bulkStatus && "pl-4")}>
                    <span className="block font-semibold">{e.merchant}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmtDate(e.expenseDate)} · {e.category}
                      <span className="md:hidden"> · {e.travelerName ?? "—"}</span>
                    </span>
                    <FlagChips flags={e.flags} className="mt-1" />
                    {e.notes && <span className="mt-1 block max-w-md text-xs italic text-muted-foreground line-clamp-2">“{e.notes}”</span>}
                    {e.reviewNote && (
                      <span className="mt-1 block max-w-md text-xs text-rose-700 dark:text-rose-300">
                        {e.reviewedByName ?? "Reviewer"}: {e.reviewNote}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">{e.travelerName ?? "—"}</td>
                  <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">{e.tripName ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(e.amount, e.currency)}
                    {!e.reimbursable && <span className="block text-[0.65rem] font-normal text-muted-foreground">company paid</span>}
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell"><StatusBadge value={e.status} /></td>
                  <td className="px-3 py-3 text-center">
                    {e.receiptFileUrl ? (
                      <a href={e.receiptFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-primary hover:text-primary/80" title="Open receipt">
                        <Paperclip className="size-4" />
                      </a>
                    ) : (
                      <span title="No receipt" className="inline-flex text-muted-foreground/40"><ImageOff className="size-4" /></span>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-4">
                    <ReviewExpenseButtons expenseId={e.id} tripId={e.tripId} status={e.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReviewDialog open={open} onClose={() => setOpen(null)} action={action} error={state?.error} count={selected.size}>
        {[...selected].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
      </ReviewDialog>
    </div>
  );
}
