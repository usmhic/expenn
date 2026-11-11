"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  Camera,
  Check,
  Copy,
  Download,
  FileText,
  FileX2,
  Hourglass,
  IdCard,
  Inbox,
  Lock,
  Plane,
  Smartphone,
  Timer,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CheckList, SectionHeading } from "./primitives";

function FeatureRow({
  id,
  eyebrow,
  icon,
  title,
  sub,
  points,
  note,
  visual,
  reverse,
}: {
  id: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
  sub: string;
  points: string[];
  note?: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-16 sm:py-24" aria-labelledby={`${id}-title`}>
      <div className="lp-container grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className={cn(reverse && "lg:order-last")}>
          <SectionHeading id={`${id}-title`} eyebrow={eyebrow} icon={icon} title={title} sub={sub} />
          <CheckList items={points} className="mt-8" />
          {note}
        </div>
        <div className="lp-stage p-3 min-[400px]:p-4 sm:p-8 lg:p-10">{visual}</div>
      </div>
    </section>
  );
}

/* ── Capture ─────────────────────────────────────────────────────────────── */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 flex h-8 items-center truncate rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function CaptureVisual() {
  const { t } = useI18n();
  const m = t.capture.mock;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6" role="img" aria-label={t.capture.title}>
      {/* Phone */}
      <div className="w-[15.5rem] shrink-0 rounded-[2.25rem] border border-border-strong bg-card p-1.5 shadow-lift">
        <div className="overflow-hidden rounded-[1.85rem] border border-border bg-canvas">
          <div className="flex justify-center pt-2">
            <span className="h-4 w-16 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <p className="text-sm font-semibold text-ink">{m.title}</p>
            <X className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-3 px-4 pb-4">
            <div className="flex gap-3 rounded-xl border border-dashed border-primary/40 bg-accent/50 p-2.5">
              {/* Receipt paper */}
              <div className="w-14 shrink-0 rounded-sm bg-card p-1.5 shadow-soft">
                <div className="space-y-1">
                  <span className="block h-1 w-8 rounded bg-foreground/40" />
                  <span className="block h-0.5 w-10 rounded bg-border-strong" />
                  <span className="block h-0.5 w-7 rounded bg-border-strong" />
                  <span className="block h-0.5 w-9 rounded bg-border-strong" />
                  <span className="mt-1.5 flex justify-between">
                    <span className="block h-1 w-4 rounded bg-foreground/40" />
                    <span className="block h-1 w-3 rounded bg-primary" />
                  </span>
                </div>
              </div>
              <div className="min-w-0 py-0.5">
                <p className="text-xs font-semibold text-foreground">{m.receipt}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Camera className="size-3" aria-hidden />
                  {m.receiptHint}
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-mint/15 px-1.5 py-px text-[10px] font-semibold text-foreground ring-1 ring-mint/40 ring-inset">
                  <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  {t.mock.expenseMeta}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label={m.amount} value={m.amountValue} />
              <Field label={m.merchant} value={m.merchantValue} />
              <Field label={m.category} value={m.categoryValue} />
              <Field label={m.trip} value={m.tripValue} />
            </div>
            <span className="primary-button button-sm w-full">{m.submit}</span>
          </div>
        </div>
      </div>

      {/* Side cards */}
      <div className="flex w-full max-w-[18rem] flex-col gap-3 sm:w-60">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wallet className="size-3.5 text-mint" aria-hidden />
            {m.owed}
          </p>
          <p className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{m.owedValue}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{m.owedMeta}</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--lp-warn)_16%,transparent)] text-[var(--lp-warn)]">
            <Undo2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{m.sentBack}</p>
            <p className="truncate text-[11px] text-muted-foreground">{m.sentBackMeta}</p>
          </div>
          <span className="secondary-button button-sm !min-h-7 !px-2 text-[11px]">{m.resubmit}</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            {m.vault}
          </p>
          <ul className="mt-3 space-y-2">
            {m.docs.map((d, i) => {
              const Icon = i === 0 ? IdCard : i === 1 ? Plane : FileText;
              return (
                <li key={d} className="flex items-center gap-2 text-xs text-foreground">
                  <Icon className="size-3.5 text-primary" aria-hidden />
                  {d}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Review & pay ────────────────────────────────────────────────────────── */

const ROW_FLAGS: ("duplicate" | "missing" | null)[] = [null, "duplicate", "duplicate", "missing"];
const ROW_SELECTED = [true, true, false, true];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function ReviewVisual() {
  const { t } = useI18n();
  const m = t.review.mock;
  return (
    <div className="lp-window" role="img" aria-label={m.title}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Inbox className="size-4 text-primary" aria-hidden />
          {m.title}
        </p>
        <span className="secondary-button button-sm !min-h-7 !px-2.5 text-[11px]">
          <Download className="size-3.5" aria-hidden />
          {m.export}
        </span>
      </div>
      <div className="scrollbar-none flex gap-4 overflow-x-auto border-b border-border px-4 text-xs">
        {m.tabs.map((tab, i) => (
          <span
            key={tab}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 font-medium",
              i === 0 ? "border-primary text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {tab}
            <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", i === 0 ? "bg-accent text-accent-foreground" : "bg-muted")}>
              {m.counts[i]}
            </span>
          </span>
        ))}
      </div>

      <div className="m-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent/70 px-3 py-2">
        <span className="mr-auto text-xs font-semibold text-accent-foreground">{m.selected}</span>
        <span className="primary-button button-sm !min-h-7 !px-2.5 text-[11px]">
          <Check className="size-3.5" aria-hidden />
          {m.approve}
        </span>
        <span className="secondary-button button-sm !min-h-7 !px-2.5 text-[11px]">{m.sendBack}</span>
        <span className="secondary-button button-sm hidden !min-h-7 !px-2.5 text-[11px] min-[420px]:inline-flex">{m.markPaid}</span>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {m.rows.map((row, i) => {
          const flag = ROW_FLAGS[i];
          const selected = ROW_SELECTED[i];
          return (
            <li key={i} className={cn("flex items-center gap-3 px-4 py-3", selected && "bg-accent/25")}>
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card",
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} aria-hidden />}
              </span>
              <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground min-[400px]:grid">
                {initials(row.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{row.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-[11px] text-muted-foreground">{row.what}</p>
                  {flag && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold",
                        flag === "duplicate"
                          ? "bg-[color-mix(in_oklab,var(--lp-warn)_14%,transparent)] text-[color-mix(in_oklab,var(--lp-warn)_75%,var(--foreground))]"
                          : "bg-[color-mix(in_oklab,var(--lp-danger)_12%,transparent)] text-[color-mix(in_oklab,var(--lp-danger)_80%,var(--foreground))]",
                      )}
                    >
                      {flag === "duplicate" ? <Copy className="size-2.5" aria-hidden /> : <FileX2 className="size-2.5" aria-hidden />}
                      {flag === "duplicate" ? m.duplicate : m.missing}
                    </span>
                  )}
                </div>
              </div>
              <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{row.amount}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Analytics ───────────────────────────────────────────────────────────── */

const SPEND = [8.2, 11.4, 6.1, 13.9, 12.2, 9.7];
const SPEND_MAX = 16;

function AnalyticsVisual() {
  const { t } = useI18n();
  const m = t.analytics.mock;
  const peak = SPEND.indexOf(Math.max(...SPEND));
  return (
    <div className="space-y-3">
      <div className="lp-window p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <BarChart3 className="size-4 text-primary" aria-hidden />
            {m.title}
          </p>
          <div className="flex rounded-lg border border-border bg-muted/60 p-0.5 text-[11px] font-semibold" aria-hidden>
            {m.currencies.map((c, i) => (
              <span key={c} className={cn("rounded-md px-2 py-1", i === 0 ? "bg-card text-foreground shadow-xs" : "text-muted-foreground")}>
                {c}
              </span>
            ))}
          </div>
        </div>

        <figure className="mt-5">
          <div className="relative h-44" role="img" aria-label={m.chartLabel}>
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
              {[0, 1, 2, 3].map((g) => (
                <span key={g} className={cn("h-px w-full", g === 3 ? "bg-border-strong" : "bg-border")} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-end gap-2 px-1 sm:gap-3">
              {SPEND.map((v, i) => (
                <div key={i} className="group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-9 rounded-t-[4px] transition-opacity group-hover:opacity-100",
                      i === peak ? "bg-primary" : "bg-primary/70",
                    )}
                    style={{ height: `${(v / SPEND_MAX) * 100}%` }}
                  />
                  <span
                    className={cn(
                      "pointer-events-none absolute -translate-y-1.5 whitespace-nowrap rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-xs transition-opacity",
                      i === peak ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                    style={{ bottom: `${(v / SPEND_MAX) * 100}%` }}
                  >
                    {m.values[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <figcaption className="mt-2 flex gap-2 px-1 sm:gap-3" aria-hidden>
            {m.months.map((mo) => (
              <span key={mo} className="flex-1 text-center text-[11px] text-muted-foreground">
                {mo}
              </span>
            ))}
          </figcaption>
        </figure>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Hourglass, label: m.decision, value: m.decisionValue },
          { icon: Timer, label: m.reimburse, value: m.reimburseValue },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">
              <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
              {label}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink tabular-nums sm:text-3xl">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureSections() {
  const { t } = useI18n();
  return (
    <>
      <FeatureRow
        id="capture"
        eyebrow={t.capture.eyebrow}
        icon={<Camera />}
        title={t.capture.title}
        sub={t.capture.sub}
        points={t.capture.points}
        visual={<CaptureVisual />}
        note={
          <p className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t.capture.mobileNote}
          </p>
        }
      />
      <FeatureRow
        id="review"
        reverse
        eyebrow={t.review.eyebrow}
        icon={<Inbox />}
        title={t.review.title}
        sub={t.review.sub}
        points={t.review.points}
        visual={<ReviewVisual />}
      />
      <FeatureRow
        id="analytics"
        eyebrow={t.analytics.eyebrow}
        icon={<BarChart3 />}
        title={t.analytics.title}
        sub={t.analytics.sub}
        points={t.analytics.points}
        visual={<AnalyticsVisual />}
      />
    </>
  );
}
