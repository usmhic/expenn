"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { createExpenseDialogAction, type DialogState } from "@/app/dialog-actions";
import { ExpenseFormFields, type ExpenseFormTrip } from "@/components/expense-form";
import { SubmitButton } from "@/components/ui/submit-button";

/** Full-page capture: save, and the form resets for the next receipt. */
export function CaptureForm({
  trips,
  defaultCurrency,
  expensesHref,
}: {
  trips: ExpenseFormTrip[];
  defaultCurrency?: string;
  expensesHref: string;
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState(createExpenseDialogAction, null as DialogState);

  useEffect(() => {
    if (!state?.success) return;
    startTransition(() => setFormKey((k) => k + 1));
    router.refresh();
    toast.success("Saved. Ready for the next receipt.", {
      action: { label: "View expenses", onClick: () => router.push(expensesHref) },
    });
  }, [state, router, expensesHref]);

  return (
    <form key={formKey} action={action} className="grid gap-4">
      {state?.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          {state.error}
        </div>
      )}
      <ExpenseFormFields trips={trips} defaultCurrency={defaultCurrency} large />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <SubmitButton name="status" value="draft" pendingText="Saving…" className="secondary-button rounded-lg text-sm">
          Save draft
        </SubmitButton>
        <SubmitButton name="status" value="submitted" pendingText="Sending…" className="primary-button rounded-lg text-sm">
          <Send className="size-4" /> Submit for review
        </SubmitButton>
      </div>
    </form>
  );
}
