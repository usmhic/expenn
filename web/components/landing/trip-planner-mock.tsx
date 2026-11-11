"use client";

import {
  Bike,
  CalendarDays,
  Car,
  CheckCircle2,
  Footprints,
  Minus,
  Plus,
  Receipt,
  Route,
  Search,
  WandSparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* Stop positions in the map's 800×520 viewBox. */
const STOPS = [
  { x: 600, y: 92 },
  { x: 690, y: 250 },
  { x: 430, y: 318 },
  { x: 150, y: 366 },
];

const ROUTE = "M600 92 C 640 132 664 184 690 250 C 640 300 520 284 430 318 C 340 352 250 340 150 366";
const ALT_ROUTE = "M600 92 C 520 140 466 222 430 318";

const BLOCKS = (() => {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 9; j++) {
      if ((i * 7 + j * 3) % 5 === 0) continue;
      const wide = (i + j) % 4 === 0;
      out.push({ x: i * 64 + 6, y: j * 58 + 6, w: wide ? 116 : 52, h: 46 });
    }
  }
  return out;
})();

export function MapIllustration({ className, showAlt = true, animate = true }: { className?: string; showAlt?: boolean; animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 800 520"
      preserveAspectRatio="xMidYMid slice"
      className={cn("lp-map-svg", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="800" height="520" fill="var(--lp-map-land)" />
      <g fill="var(--lp-map-block)">
        {BLOCKS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="5" />
        ))}
      </g>
      <g fill="var(--lp-map-park)">
        <ellipse cx="250" cy="168" rx="74" ry="42" transform="rotate(-12 250 168)" />
        <ellipse cx="530" cy="190" rx="44" ry="30" />
        <ellipse cx="80" cy="240" rx="44" ry="60" />
      </g>
      <g fill="none" strokeLinecap="round">
        <path d="M-10 250 C 180 232 360 214 820 150" stroke="var(--lp-map-major-edge)" strokeWidth="16" />
        <path d="M330 -10 C 352 140 392 262 404 530" stroke="var(--lp-map-major-edge)" strokeWidth="16" />
        <path d="M-10 250 C 180 232 360 214 820 150" stroke="var(--lp-map-major)" strokeWidth="11" />
        <path d="M330 -10 C 352 140 392 262 404 530" stroke="var(--lp-map-major)" strokeWidth="11" />
        <path d="M120 -10 C 140 120 190 260 230 530" stroke="var(--lp-map-road)" strokeWidth="6" />
        <path d="M-10 90 C 200 110 480 60 820 40" stroke="var(--lp-map-road)" strokeWidth="6" />
        <path d="M520 -10 C 560 160 600 300 640 530" stroke="var(--lp-map-road)" strokeWidth="6" />
      </g>
      <path
        d="M0 432 C 140 404 240 442 360 420 C 480 398 600 368 800 338 L800 520 L0 520 Z"
        fill="var(--lp-map-water)"
      />
      <path d="M548 530 L672 330" stroke="var(--lp-map-major-edge)" strokeWidth="12" strokeLinecap="round" />
      <path d="M548 530 L672 330" stroke="var(--lp-map-major)" strokeWidth="7" strokeLinecap="round" />

      {showAlt && (
        <path
          d={ALT_ROUTE}
          fill="none"
          stroke="var(--map-route-alt)"
          strokeWidth="6"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
      )}
      <path
        d={ROUTE}
        pathLength={1}
        fill="none"
        stroke="var(--map-casing)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "lp-route-line" : undefined}
      />
      <path
        d={ROUTE}
        pathLength={1}
        fill="none"
        stroke="var(--map-route)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "lp-route-line" : undefined}
      />

      {STOPS.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          {i === 0 && <circle r="22" fill="var(--map-route)" className="lp-pulse" />}
          <circle r="18" fill="var(--map-route)" stroke="var(--map-casing)" strokeWidth="4" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--map-casing)"
            fontSize="17"
            fontWeight="700"
            fontFamily="var(--font-sans)"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function TripPlannerMock() {
  const { t } = useI18n();
  const m = t.mock;
  const modes = [
    { icon: Car, label: m.driving, active: true },
    { icon: Bike, label: m.cycling },
    { icon: Footprints, label: m.walking },
  ];

  return (
    <div className="relative">
      <div className="lp-window shadow-elegant" role="img" aria-label={m.label}>
        {/* Browser chrome */}
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

        <div className="grid md:h-[30rem] md:grid-cols-[17rem_1fr] lg:h-[33rem] lg:grid-cols-[19rem_1fr]">
          {/* Map */}
          <div className="relative aspect-[4/3] overflow-hidden md:order-last md:aspect-auto">
            <MapIllustration className="absolute inset-0" />

            <div className="absolute left-3 top-3 flex h-9 w-[min(15rem,62%)] items-center gap-2 rounded-lg border border-border bg-card/95 px-3 text-xs text-muted-foreground shadow-soft">
              <Search className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{m.search}</span>
            </div>

            <div className="absolute right-3 top-3 hidden flex-col overflow-hidden rounded-lg border border-border bg-card/95 shadow-soft sm:flex" aria-hidden>
              <span className="grid size-8 place-items-center text-muted-foreground">
                <Plus className="size-3.5" />
              </span>
              <span className="grid size-8 place-items-center border-t border-border text-muted-foreground">
                <Minus className="size-3.5" />
              </span>
            </div>

            <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] font-medium text-foreground shadow-soft sm:text-xs">
              <Route className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate tabular-nums">{m.total}</span>
            </div>

            {/* Captured receipt toast */}
            <div className="absolute bottom-16 right-4 hidden w-64 rounded-xl border border-border bg-card p-3 shadow-lift sm:block lg:bottom-20 lg:right-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Receipt className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">{m.expenseTitle}</p>
                    <p className="text-[13px] font-semibold tabular-nums text-ink">{m.expenseAmount}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] text-muted-foreground">{m.expenseMeta}</p>
                    <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-mint/40 ring-inset">
                      {m.ready}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <span className="absolute bottom-1 right-1.5 rounded bg-card/85 px-1 text-[9px] text-muted-foreground">
              {m.attribution}
            </span>
          </div>

          {/* Itinerary panel */}
          <div className="flex flex-col gap-4 border-t border-border p-4 md:border-r md:border-t-0 lg:p-5">
            <div>
              <p className="font-display text-base font-semibold tracking-tight text-ink">{m.trip}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden />
                {m.dates}
              </p>
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{m.budget}</span>
                <span className="font-medium tabular-nums text-foreground">{m.budgetValue}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[62%] rounded-full bg-gradient-brand" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/60 p-1" aria-hidden>
              {modes.map(({ icon: Icon, label, active }) => (
                <span
                  key={label}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1.5 rounded-md text-[11px] font-medium",
                    active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </span>
              ))}
            </div>

            <ol className="flex flex-col">
              {m.stops.map((stop, i) => (
                <li key={stop} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    {i < m.stops.length - 1 && <span className="my-1 w-px flex-1 border-l border-dashed border-border-strong" />}
                  </div>
                  <div className={cn("min-w-0 flex-1", i < m.stops.length - 1 && "pb-3")}>
                    <p className="truncate pt-0.5 text-[13px] font-medium text-foreground">{stop}</p>
                    {m.legs[i] && (
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{m.legs[i]}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <span className="secondary-button button-sm mt-auto w-full" aria-hidden>
              <WandSparkles className="size-3.5 text-primary" />
              {m.optimise}
            </span>
          </div>
        </div>
      </div>

      {/* Approval toast, outside the frame on wide screens */}
      <div className="lp-float absolute -right-5 -top-6 hidden w-64 rounded-xl border border-border bg-card p-3 shadow-lift lg:block xl:-right-10">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">{m.approved}</p>
            <p className="truncate text-[11px] text-muted-foreground">{m.approvedMeta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
