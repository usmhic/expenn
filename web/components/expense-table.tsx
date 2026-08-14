"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, MessageSquare, Paperclip } from "lucide-react";
import { StatusBadge } from "@/components/layout/navigation";
import { ReviewExpenseButtons } from "@/components/dialogs";
import { addExpenseCommentAction } from "@/app/dialog-actions";
import { cn } from "@/lib/utils";

export type CommentRow = {
  id: string;
  expenseId: string;
  body: string;
  userId: string;
  authorName: string;
  createdAt: Date;
};

export type ExpenseRow = {
  id: string;
  merchant: string;
  travelerName?: string | null;
  category: string;
  amount: string | number;
  currency: string;
  expenseDate: Date;
  status: string;
  receiptFileUrl?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  tripId?: string | null;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  personal_card: "Personal card",
  company_card: "Company card",
  bank_transfer: "Bank transfer",
  other: "Other",
};

type Tab = "all" | "submitted" | "approved" | "rejected" | "draft" | "reimbursed";

const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  submitted: "Pending review",
  approved: "Approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected",
  draft: "Draft",
};

function fmt(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function fmtAmount(amount: string | number, currency: string) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function ExpenseTable({
  expenses,
  showTraveler = true,
  showReview = false,
  tripId,
  defaultTab = "all",
  emptyMessage = "No expenses found.",
  comments = {},
}: {
  expenses: ExpenseRow[];
  showTraveler?: boolean;
  showReview?: boolean;
  tripId?: string;
  defaultTab?: Tab;
  emptyMessage?: string;
  comments?: Record<string, CommentRow[]>;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const statuses = Array.from(new Set(expenses.map((e) => e.status)));
  const visibleTabs: Tab[] = ["all", "submitted", "approved", "reimbursed", "rejected", "draft"].filter(
    (t) => t === "all" || statuses.includes(t)
  ) as Tab[];

  const filtered = tab === "all" ? expenses : expenses.filter((e) => e.status === tab);
  const submittedCount = expenses.filter((e) => e.status === "submitted").length;

  return (
    <div>
      {visibleTabs.length > 1 && (
        <div
          className="flex overflow-x-auto border-b border-border/60"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {visibleTabs.map((t) => {
            const count = t === "all" ? expenses.length : expenses.filter((e) => e.status === t).length;
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {TAB_LABELS[t]}
                {t === "submitted" && submittedCount > 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-amber-100 text-[0.6rem] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                    {submittedCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="py-2.5 pl-4 pr-3 text-xs font-semibold text-muted-foreground">Merchant</th>
                {showTraveler && (
                  <th className="hidden py-2.5 px-3 text-xs font-semibold text-muted-foreground sm:table-cell">Traveler</th>
                )}
                <th className="hidden py-2.5 px-3 text-xs font-semibold text-muted-foreground md:table-cell">Category</th>
                <th className="hidden py-2.5 px-3 text-xs font-semibold text-muted-foreground lg:table-cell">Date</th>
                <th className="hidden py-2.5 px-3 text-xs font-semibold text-muted-foreground xl:table-cell">Payment</th>
                <th className="py-2.5 px-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="py-2.5 px-3 text-center text-xs font-semibold text-muted-foreground">
                  <span title="Receipt attached">Rcpt</span>
                </th>
                {showReview && (
                  <th className="py-2.5 pl-3 pr-4 text-xs font-semibold text-muted-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  showTraveler={showTraveler}
                  showReview={showReview}
                  tripId={tripId ?? expense.tripId ?? undefined}
                  expenseComments={comments[expense.id] ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  showTraveler,
  showReview,
  tripId,
  expenseComments,
}: {
  expense: ExpenseRow;
  showTraveler: boolean;
  showReview: boolean;
  tripId?: string;
  expenseComments: CommentRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isSubmitted = expense.status === "submitted";
  const hasExpandable = !!(expense.notes || expenseComments.length > 0 || showReview);
  const colSpan = (showTraveler ? 1 : 0) + 7 + (showReview ? 1 : 0);

  return (
    <>
      <tr
        className={cn(
          "group transition-colors hover:bg-secondary/40",
          isSubmitted && "bg-amber-50/30 dark:bg-amber-400/5"
        )}
        onClick={() => setExpanded((v) => !v)}
        style={{ cursor: "pointer" }}
      >
        {/* Merchant */}
        <td className="py-3 pl-4 pr-3">
          <span className="block font-semibold">{expense.merchant}</span>
          <span className="block text-xs text-muted-foreground sm:hidden">
            {expense.category}
            {showTraveler && expense.travelerName ? ` · ${expense.travelerName}` : ""}
          </span>
        </td>

        {showTraveler && (
          <td className="hidden py-3 px-3 text-muted-foreground sm:table-cell">
            {expense.travelerName ?? "—"}
          </td>
        )}

        <td className="hidden py-3 px-3 text-muted-foreground md:table-cell">
          {expense.category}
        </td>

        <td className="hidden py-3 px-3 text-muted-foreground lg:table-cell whitespace-nowrap">
          {fmt(expense.expenseDate)}
        </td>

        <td className="hidden py-3 px-3 text-muted-foreground xl:table-cell whitespace-nowrap">
          {expense.paymentMethod ? PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod : "—"}
        </td>

        <td className="py-3 px-3 text-right font-semibold tabular-nums whitespace-nowrap">
          {fmtAmount(expense.amount, expense.currency)}
        </td>

        <td className="py-3 px-3">
          <StatusBadge value={expense.status} />
        </td>

        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
          {expense.receiptFileUrl ? (
            <a
              href={expense.receiptFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
              title="View receipt"
            >
              <Paperclip className="size-3.5" />
            </a>
          ) : (
            <span title="No receipt" className="inline-flex items-center justify-center text-muted-foreground/40">
              <ImageOff className="size-3.5" />
            </span>
          )}
        </td>

        {showReview && (
          <td className="py-3 pl-3 pr-4" onClick={(e) => e.stopPropagation()}>
            {isSubmitted ? (
              <ReviewExpenseButtons expenseId={expense.id} tripId={tripId} />
            ) : null}
          </td>
        )}
      </tr>

      {expanded && (
        <tr className="bg-secondary/20">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="grid gap-3">
              {expense.notes && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                  {expense.notes}
                </p>
              )}
              <CommentSection
                expenseId={expense.id}
                tripId={tripId}
                comments={expenseComments}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CommentSection({
  expenseId,
  tripId,
  comments,
}: {
  expenseId: string;
  tripId?: string;
  comments: CommentRow[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addExpenseCommentAction, null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [state?.success, router]);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageSquare className="size-3" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {comments.length > 0 && (
        <div className="space-y-1.5">
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{c.authorName}</span>
                <span className="text-[0.65rem] text-muted-foreground">{fmtTime(c.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-foreground/80">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="expenseId" value={expenseId} />
        {tripId && <input type="hidden" name="tripId" value={tripId} />}
        <textarea
          name="body"
          placeholder="Add a comment or clarification…"
          className="form-control min-h-[2.25rem] flex-1 resize-none text-xs"
          rows={1}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="submit"
          className="secondary-button self-end shrink-0 text-xs px-3"
          onClick={(e) => e.stopPropagation()}
        >
          Post
        </button>
      </form>
      {state?.error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
    </div>
  );
}
