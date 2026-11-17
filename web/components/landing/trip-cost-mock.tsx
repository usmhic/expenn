"use client";

import { BedDouble, Camera, Car, Check, Plane, Receipt, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SLICE_COLORS = ["bg-primary", "bg-teal-500", "bg-amber-500", "bg-violet-500", "bg-sky-500"];
const BOOKING_ICONS = [Plane, BedDouble, Car];

/** Hero illustration: one trip's bookings, receipts and totals, as the app shows them. */
export function TripCostMock() {
  const { t } = useI18n();
  const m = t.costMock;

  return (
    <div className="lp-window shadow-elegant" role="img" aria-label={m.label}>
      <div className="flex h-10 items-center gap-3 border-b border-border bg-muted/60 px-3.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </div>
        <div className="mx-auto flex h-6 min-w-0 max-w-xs flex-1 items-center justify-center rounded-md border border-border bg-card px-3 text-[11px] text-muted-foreground">
          <span className="truncate">{m.url}</span>
        </div>
        <div className="w-10" aria-hidden />
      </div>

      <div className="grid gap-4 bg-canvas p-4 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-6">
        {/* Totals */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">{m.kind}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-3" aria-hidden />{m.party}</span>
            <span className="text-muted-foreground">{m.dates}</span>
          </div>
          <p className="mt-2 text-base font-semibold tracking-tight text-ink sm:text-lg">{m.trip}</p>

          <p className="mt-5 text-xs text-muted-foreground">{m.totalLabel}</p>
          <p className="font-display text-4xl font-semibold tracking-tight text-ink tabular-nums">{m.total}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span><span className="font-semibold tabular-nums text-ink">{m.perPerson}</span> <span className="text-muted-foreground">{m.perPersonLabel}</span></span>
            <span><span className="font-semibold tabular-nums text-ink">{m.perDay}</span> <span className="text-muted-foreground">{m.perDayLabel}</span></span>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-[11px]">
              <span className="font-medium text-foreground">{m.budget}</span>
              <span className="text-muted-foreground">{m.budgetLeft}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[87%] rounded-full bg-primary" />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {m.categories.map((c, i) => (
                <span key={c.name} className={cn("h-full", SLICE_COLORS[i % SLICE_COLORS.length])} style={{ width: `${c.share}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {m.categories.map((c, i) => (
                <li key={c.name} className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("size-2 shrink-0 rounded-sm", SLICE_COLORS[i % SLICE_COLORS.length])} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.name}</span>
                  <span className="font-medium tabular-nums text-foreground">{c.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bookings and receipts */}
        <div className="grid content-start gap-4">
          <div className="rounded-2xl border border-border bg-card shadow-xs">
            <p className="border-b border-border px-4 py-3 text-sm font-semibold text-ink">{m.bookingsTitle}</p>
            <ul className="divide-y divide-border">
              {m.bookings.map((b, i) => {
                const Icon = BOOKING_ICONS[i] ?? Plane;
                return (
                  <li key={b.title} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{b.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{b.meta}</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="text-[13px] font-semibold tabular-nums text-ink">{b.amount}</span>
                      <span className={cn("text-[10px] font-semibold", i === 2 ? "text-amber-700 dark:text-amber-300" : "text-teal-700 dark:text-teal-300")}>{b.status}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">{m.receiptsTitle}</p>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                <Camera className="size-3.5" aria-hidden /> {m.snap}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {m.receipts.map((r) => (
                <li key={r.title} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Receipt className="size-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{r.title}</span>
                    <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"><Check className="size-3 text-teal-600" aria-hidden />{r.meta}</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{r.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
