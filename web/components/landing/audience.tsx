"use client";

import { Building2, Check, User, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SectionHeading } from "./primitives";

const ICONS = [User, Users, Building2];

/** Who Expenn is for: individuals, families and friends, organisations. */
export function AudienceSection() {
  const { t } = useI18n();
  const a = t.audience;
  return (
    <section id="for" className="scroll-mt-20 border-t border-border bg-card py-20 sm:py-28" aria-labelledby="lp-audience-title">
      <div className="lp-container">
        <SectionHeading id="lp-audience-title" align="center" eyebrow={a.eyebrow} title={a.title} sub={a.sub} />
        <ul className="mt-12 grid gap-4 sm:mt-14 md:grid-cols-3 lg:gap-5">
          {a.items.map((item, i) => {
            const Icon = ICONS[i] ?? User;
            return (
              <li key={item.t} className="flex flex-col rounded-2xl border border-border bg-canvas p-6 transition-shadow hover:shadow-soft">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-ink">{item.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
                <ul className="mt-5 space-y-2.5">
                  {item.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-mint" strokeWidth={2.5} aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
