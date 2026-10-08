"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, X } from "lucide-react";
import { DateButton } from "@/components/ui/date-button";
import type { ExpenseDto } from "@/lib/api-client";
import { COMMON_CURRENCIES, EXPENSE_CATEGORIES, PAYMENT_METHODS, todayIso } from "@/lib/expenses";
import { cn } from "@/lib/utils";

export type ExpenseFormTrip = { id: string; name: string; currency?: string; status?: string };

/**
 * The one expense form used by "Add expense", "Edit expense", and the Capture page.
 * Receipt first, then the fields a reviewer needs. Defaults remove typing: today's date,
 * the active trip, and that trip's currency.
 */
export function ExpenseFormFields({
  trips,
  expense,
  defaultCurrency = "USD",
  large = false,
}: {
  trips: ExpenseFormTrip[];
  expense?: Partial<ExpenseDto>;
  defaultCurrency?: string;
  large?: boolean;
}) {
  const activeTrip = trips.find((t) => t.status === "active");
  const initialTripId = expense ? expense.tripId ?? "" : activeTrip?.id ?? "";
  const [tripId, setTripId] = useState(initialTripId);
  const [currency, setCurrency] = useState(
    expense?.currency ?? trips.find((t) => t.id === initialTripId)?.currency ?? defaultCurrency
  );
  const [currencyTouched, setCurrencyTouched] = useState(Boolean(expense));
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "");
  const [reimbursable, setReimbursable] = useState(expense?.reimbursable ?? true);

  const currencies = Array.from(new Set([currency, ...COMMON_CURRENCIES]));
  const categories = expense?.category && !EXPENSE_CATEGORIES.includes(expense.category as never)
    ? [expense.category, ...EXPENSE_CATEGORIES]
    : EXPENSE_CATEGORIES;

  function onTripChange(id: string) {
    setTripId(id);
    const tripCurrency = trips.find((t) => t.id === id)?.currency;
    if (tripCurrency && !currencyTouched) setCurrency(tripCurrency);
  }

  function onPaymentChange(value: string) {
    setPaymentMethod(value);
    // Company-card spend is already paid by the company.
    if (value === "company_card") setReimbursable(false);
    else if (paymentMethod === "company_card") setReimbursable(true);
  }

  return (
    <div className="grid gap-3">
      <ReceiptInput existingUrl={expense?.receiptFileUrl} large={large} />

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Amount
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            defaultValue={expense?.amount}
            className="form-control font-normal tabular-nums"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Currency
          <select
            name="currency"
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); setCurrencyTouched(true); }}
            className="form-control font-normal"
          >
            {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Merchant
          <input name="merchant" required minLength={2} placeholder="e.g. Marriott Hotel" defaultValue={expense?.merchant} className="form-control font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Date
          <DateButton
            name="date"
            required
            defaultValue={expense?.expenseDate ? expense.expenseDate.slice(0, 10) : todayIso()}
            max={todayIso()}
            placeholder="Receipt date"
            className="w-full"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Category
          <select name="category" required defaultValue={expense?.category ?? ""} className="form-control font-normal">
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Trip
          <select name="tripId" value={tripId} onChange={(e) => onTripChange(e.target.value)} className="form-control font-normal">
            <option value="">No trip</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Paid with
          <select name="paymentMethod" value={paymentMethod} onChange={(e) => onPaymentChange(e.target.value)} className="form-control font-normal">
            <option value="">Choose…</option>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
          <input type="hidden" name="reimbursable" value={reimbursable ? "true" : "false"} />
          <input
            type="checkbox"
            checked={reimbursable}
            onChange={(e) => setReimbursable(e.target.checked)}
            className="size-4 rounded accent-primary"
          />
          <span>Pay me back</span>
        </label>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        Notes <span className="sr-only">(optional)</span>
        <textarea
          name="notes"
          placeholder="Business purpose, attendees, anything the reviewer should know"
          defaultValue={expense?.notes}
          className="form-control min-h-16 font-normal"
        />
      </label>
    </div>
  );
}

/** Drop zone with an instant preview. On phones the picker offers the camera, photos, and files. */
function ReceiptInput({ existingUrl, large }: { existingUrl?: string; large?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const previewRef = useRef<string | null>(null);

  function selectFile(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next && next.type.startsWith("image/") ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(previewRef.current);
  }

  // Release the last preview URL when the form unmounts.
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  return (
    <div className="grid gap-1 text-sm font-medium">
      <span>Receipt</span>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          const input = e.currentTarget.querySelector("input[type=file]") as HTMLInputElement | null;
          if (dropped && input) {
            input.files = e.dataTransfer.files;
            selectFile(dropped);
          }
        }}
        className={cn(
          "relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/30 px-3 transition-colors hover:border-primary/60 hover:bg-primary/5",
          large ? "min-h-36 flex-col justify-center py-6 text-center" : "py-3",
          dragging && "border-primary bg-primary/10"
        )}
      >
        <input
          key={inputKey}
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt preview" className={cn("rounded-md object-cover", large ? "max-h-48" : "size-12")} />
        ) : file ? (
          <FileText className="size-8 shrink-0 text-primary" />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="size-5" />
          </span>
        )}
        <span className="min-w-0 font-normal">
          <span className="block truncate font-medium">
            {file ? file.name : existingUrl ? "Replace the attached receipt" : "Add a photo or PDF"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {file ? `${(file.size / 1024).toFixed(0)} KB` : "Tap to snap or choose a file, or drop it here"}
          </span>
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); selectFile(null); setInputKey((k) => k + 1); }}
            className="icon-button absolute right-2 top-2"
            aria-label="Remove receipt"
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>
      {existingUrl && !file && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-primary hover:underline">
          View current receipt
        </a>
      )}
    </div>
  );
}
