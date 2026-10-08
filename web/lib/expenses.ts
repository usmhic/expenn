/**
 * Shared expense vocabulary for the web client: categories, currencies, money
 * formatting, and labels for the review flags the API attaches to expenses.
 */

import type { CurrencyTotalDto, ExpenseDto } from "@/lib/api-client";

/** Standard categories keep analytics and accounting exports clean. Free text is still accepted by the API. */
export const EXPENSE_CATEGORIES = [
  "Meals",
  "Lodging",
  "Airfare",
  "Ground transport",
  "Mileage",
  "Fuel",
  "Conference & training",
  "Client entertainment",
  "Office & supplies",
  "Software",
  "Phone & internet",
  "Other",
] as const;

export const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "INR", "SGD", "AED", "SEK", "NOK", "DKK", "PLN", "BRL", "MXN", "ZAR",
] as const;

export const PAYMENT_METHODS = [
  { value: "personal_card", label: "Personal card" },
  { value: "company_card", label: "Company card" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
] as const;

export const FLAG_LABELS: Record<string, { label: string; hint: string }> = {
  missing_receipt: { label: "No receipt", hint: "No receipt is attached to this expense." },
  possible_duplicate: {
    label: "Possible duplicate",
    hint: "Another expense by the same person has the same amount, currency, and date.",
  },
};

/** Locale-aware money, e.g. "€1,240.50". Falls back to "XYZ 12.00" for unknown codes. */
export function formatMoney(amount: number | string, currency: string, opts: { compact?: boolean } = {}) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: opts.compact && Math.abs(value) >= 10_000 ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(opts.compact ? 0 : 2)}`;
  }
}

/** Joins per-currency amounts without ever adding different currencies together. */
export function formatTotals(totals: { currency: string; amount: number }[], empty = "—") {
  const nonZero = totals.filter((t) => Math.abs(t.amount) >= 0.005);
  return nonZero.length > 0 ? nonZero.map((t) => formatMoney(t.amount, t.currency)).join(" · ") : empty;
}

/** Sums expenses per currency, largest first. */
export function totalsByCurrency(expenses: Pick<ExpenseDto, "amount" | "currency">[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.currency, (map.get(e.currency) ?? 0) + Number(e.amount));
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function pick(totals: CurrencyTotalDto[] | undefined, key: "total" | "pending" | "owed" | "reimbursed") {
  return (totals ?? []).map((t) => ({ currency: t.currency, amount: t[key] }));
}

export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
