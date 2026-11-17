"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DateButton } from "@/components/ui/date-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateTripDialogAction, type DialogState } from "@/app/dialog-actions";
import type { TripDto, TripKind } from "@/lib/api-client";
import { TRIP_KINDS, tripKindsFor } from "@/lib/bookings";
import { COMMON_CURRENCIES } from "@/lib/expenses";
import { cn } from "@/lib/utils";

/** Edits a trip's name, destination, dates, budget, type and companions. */
export function EditTripDialog({ trip, personal }: { trip: TripDto; personal: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateTripDialogAction, null as DialogState);
  const current = (trip.kind ?? (personal ? "personal" : "business")) as TripKind;
  const offered = tripKindsFor(personal);
  // Keep a kind the workspace no longer offers selectable on trips that already use it.
  const kinds = offered.some((k) => k.value === current) ? offered : [...offered, TRIP_KINDS.find((k) => k.value === current)!];
  const [kind, setKind] = useState<TripKind>(current);

  useEffect(() => {
    if (!state?.success) return;
    startTransition(() => setOpen(false));
    toast.success("Trip updated.");
    router.refresh();
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="secondary-button"><Pencil className="size-4" /> Edit trip</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit trip</DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          {state?.error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{state.error}</div>
          )}
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="kind" value={kind} />
          <fieldset>
            <legend className="mb-2 text-[0.8125rem] font-semibold">Who&apos;s it for?</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {kinds.map((k) => (
                <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} className="chip chip-button" onClick={() => setKind(k.value)}>
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field sm:col-span-2">
              Trip name
              <input name="name" required minLength={2} defaultValue={trip.name} className="form-control" />
            </label>
            <label className="field sm:col-span-2">
              Main destination
              <input name="destination" required minLength={2} defaultValue={trip.destination} className="form-control" />
            </label>
            <label className={cn("field sm:col-span-2", kind !== "family" && kind !== "group" && "hidden")}>
              Who else is coming? <span className="field-hint">Names, separated by commas</span>
              <input name="companions" defaultValue={(trip.companions ?? []).join(", ")} className="form-control" />
            </label>
            <label className="field">
              Starts
              <DateButton name="startDate" required defaultValue={trip.startDate.slice(0, 10)} className="w-full" />
            </label>
            <label className="field">
              Ends
              <DateButton name="endDate" required defaultValue={trip.endDate.slice(0, 10)} className="w-full" />
            </label>
            <label className="field">
              Budget <span className="field-hint">0 for none</span>
              <input name="budget" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={trip.budget || ""} className="form-control tabular-nums" />
            </label>
            <label className="field">
              Currency
              <select name="currency" defaultValue={trip.currency} className="form-control">
                {Array.from(new Set([trip.currency, ...COMMON_CURRENCIES])).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button>
            <SubmitButton pendingText="Saving…" className="primary-button">Save changes</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
