"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, Check, ChevronRight, ListChecks, Send, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GithubIcon } from "./icons";
import { DEMO_URL, GITHUB_URL, type LandingAccountState } from "./links";
import { SectionHeading } from "./primitives";
import { TripPlannerMock } from "./trip-planner-mock";

export function Hero({ account }: { account: LandingAccountState | null }) {
  const { t } = useI18n();
  const dashboardHref = account?.signedIn ? account.redirectTo ?? "/login" : null;

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="lp-hero-title">
      <div className="absolute inset-0 -z-10 bg-hero" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[44rem] grid-bg [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div className="lp-hero-glow" aria-hidden />

      <div className="lp-container pb-16 pt-14 text-center sm:pb-24 sm:pt-20 lg:pt-24">
        <Link
          href="#trips"
          className="lp-rise group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:border-border-strong sm:text-sm"
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground sm:text-xs">
            {t.hero.badgeNew}
          </span>
          <span className="truncate">{t.hero.badge}</span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>

        <h1
          id="lp-hero-title"
          className="lp-rise lp-rise-1 mx-auto mt-7 max-w-5xl font-display text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.045em] text-ink min-[400px]:text-[2.75rem] sm:text-6xl lg:text-[5rem]"
        >
          {t.hero.title1}{" "}
          <span className="text-gradient-brand sm:block">{t.hero.title2}</span>
        </h1>

        <p className="lp-rise lp-rise-2 lp-lead mx-auto mt-6 max-w-2xl sm:text-xl sm:leading-relaxed">{t.hero.sub}</p>

        <div className="lp-rise lp-rise-3 mt-9 flex flex-col items-stretch justify-center gap-3 min-[480px]:flex-row min-[480px]:items-center">
          {dashboardHref ? (
            <>
              <Link href={dashboardHref} className="primary-button button-lg shadow-elegant">
                {t.nav.openDashboard}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="secondary-button button-lg">
                <GithubIcon className="size-4" />
                {t.hero.ctaGithub}
              </a>
            </>
          ) : (
            <>
              <Link href="/register" className="primary-button button-lg shadow-elegant">
                {t.hero.ctaPrimary}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="secondary-button button-lg">
                {t.hero.ctaDemo}
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
              </a>
            </>
          )}
        </div>

        <ul className="lp-rise lp-rise-3 mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {t.hero.points.map((p) => (
            <li key={p} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-mint" strokeWidth={2.5} aria-hidden />
              {p}
            </li>
          ))}
        </ul>

        <div className="lp-rise lp-rise-4 mx-auto mt-14 max-w-6xl text-left sm:mt-20">
          <TripPlannerMock />
        </div>

        <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">{t.builtOn.label}</p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-display text-[0.9375rem] font-semibold tracking-tight text-muted-foreground sm:text-lg">
            {t.builtOn.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const STEP_ICONS = [Camera, Send, ListChecks, Wallet];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="how" className="scroll-mt-20 border-t border-border bg-card py-20 sm:py-28" aria-labelledby="lp-how-title">
      <div className="lp-container">
        <SectionHeading id="lp-how-title" align="center" eyebrow={t.how.eyebrow} title={t.how.title} sub={t.how.sub} />

        <ol className="relative mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <span
            className="absolute left-[12%] right-[12%] top-[3.25rem] hidden h-px bg-linear-to-r from-transparent via-border-strong to-transparent lg:block"
            aria-hidden
          />
          {t.how.steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Camera;
            const last = i === t.how.steps.length - 1;
            return (
              <li key={step.t} className="relative rounded-2xl border border-border bg-canvas p-6 transition-shadow hover:shadow-soft">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid size-11 place-items-center rounded-xl",
                      last ? "bg-mint/15 text-foreground ring-1 ring-mint/40 ring-inset" : "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-mono text-xs font-medium text-subtle">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
