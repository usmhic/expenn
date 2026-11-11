"use client";

import type { ReactNode } from "react";
import {
  Bike,
  Car,
  CheckCircle2,
  Footprints,
  GripVertical,
  MapPin,
  MapPinned,
  NotebookPen,
  Plus,
  Search,
  Split,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./primitives";
import { MapIllustration } from "./trip-planner-mock";

function BentoCard({ title, d, className, children }: { title: string; d: string; className?: string; children: ReactNode }) {
  return (
    <article className={cn("flex flex-col rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-7", className)}>
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
      <div className="mt-6 flex flex-1 flex-col justify-end">{children}</div>
    </article>
  );
}

const MODE_ICONS = [Car, Bike, Footprints];

export function TripsSection() {
  const { t } = useI18n();
  const tr = t.trips;

  return (
    <section id="trips" className="scroll-mt-20 py-20 sm:py-28" aria-labelledby="lp-trips-title">
      <div className="lp-container">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-16">
          <div>
            <Eyebrow icon={<MapPinned />}>{tr.eyebrow}</Eyebrow>
            <h2 id="lp-trips-title" className="lp-h2 mt-4">
              {tr.title1} <span className="text-muted-foreground">{tr.title2}</span>
            </h2>
          </div>
          <p className="lp-lead">{tr.sub}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {/* Compare routes */}
          <BentoCard title={tr.routes.title} d={tr.routes.d} className="sm:col-span-2">
            <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
              <div className="relative h-52 overflow-hidden rounded-2xl border border-border md:h-full md:min-h-60">
                <MapIllustration className="absolute inset-0" animate={false} />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-xs">
                  <Split className="size-3.5 text-primary" aria-hidden />
                  {tr.routes.alternatives}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {tr.routes.options.map((o, i) => {
                  const Icon = MODE_ICONS[i] ?? Car;
                  const active = i === 0;
                  return (
                    <li
                      key={o.mode}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3",
                        active ? "border-primary/40 bg-accent/60" : "border-border bg-canvas",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-semibold text-foreground">{o.mode}</p>
                          {active && (
                            <span className="rounded-full bg-mint/15 px-1.5 py-px text-[10px] font-semibold text-foreground ring-1 ring-mint/40 ring-inset">
                              {tr.routes.fastest}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{o.value}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </BentoCard>

          {/* Optimise order */}
          <BentoCard title={tr.optimise.title} d={tr.optimise.d}>
            <div className="space-y-4 rounded-2xl border border-border bg-canvas p-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{tr.optimise.before}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{tr.optimise.beforeValue}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-border-strong" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{tr.optimise.after}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-mint/15 px-1.5 py-px text-[10px] font-semibold tabular-nums text-foreground ring-1 ring-mint/40 ring-inset">
                      {tr.optimise.saved}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">{tr.optimise.afterValue}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-[78%] rounded-full bg-gradient-brand" />
              </div>
              <ol className="space-y-1.5 border-t border-border pt-4">
                {t.mock.stops.slice(0, 3).map((s, i) => (
                  <li key={s} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground shadow-xs">
                    <GripVertical className="size-3.5 shrink-0 text-subtle" aria-hidden />
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </BentoCard>

          {/* Itinerary */}
          <BentoCard title={tr.itinerary.title} d={tr.itinerary.d}>
            <ol className="relative space-y-4 rounded-2xl border border-border bg-canvas p-4">
              {tr.itinerary.days.map((d, i) => (
                <li key={i} className="grid grid-cols-[3.25rem_1fr] gap-3">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{d.day}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{d.time}</p>
                  </div>
                  <div className="min-w-0 border-l-2 border-primary/25 pl-3">
                    <p className="truncate text-sm font-medium text-foreground">{d.place}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <NotebookPen className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{d.note}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </BentoCard>

          {/* Search places */}
          <BentoCard title={tr.search.title} d={tr.search.d}>
            <div className="rounded-2xl border border-border bg-canvas p-3">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-primary/50 bg-card px-3 text-sm text-foreground ring-3 ring-primary/10">
                <Search className="size-4 text-muted-foreground" aria-hidden />
                <span>{tr.search.query}</span>
                <span className="-ml-1.5 h-4 w-px animate-pulse bg-primary" aria-hidden />
              </div>
              <ul className="mt-2 space-y-1">
                {tr.search.results.map((r, i) => (
                  <li
                    key={r}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]",
                      i === 0 ? "bg-accent text-accent-foreground" : "text-foreground",
                    )}
                  >
                    <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{r}</span>
                    {i === 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        <Plus className="size-3" aria-hidden />
                        {tr.search.add}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </BentoCard>

          {/* Budget & approvals */}
          <BentoCard title={tr.budget.title} d={tr.budget.d} className="sm:col-span-2 lg:col-span-1">
            <div className="rounded-2xl border border-border bg-canvas p-4">
              <p className="text-xs text-muted-foreground">{tr.budget.spent}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{tr.budget.spentValue}</span>
                <span className="text-sm text-muted-foreground">{tr.budget.of}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[62%] rounded-full bg-gradient-brand" />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 text-mint" aria-hidden />
                {tr.budget.approval}
              </div>
            </div>
          </BentoCard>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{tr.attribution}</p>
      </div>
    </section>
  );
}
