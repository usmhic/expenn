'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Camera, Receipt, CreditCard, BarChart3, FolderLock,
  Users, Smartphone, ArrowRight, Briefcase,
  ScanLine, FolderTree, Send, Wallet, Inbox, Eye, ThumbsUp, FileSpreadsheet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { ViewSwitcher } from "@/components/landing/view-switch";
import { StoreButtons } from "@/components/landing/store-buttons";
import { AdminMockup, TravelerMockup } from "@/components/landing/mockups";
import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { LandingProviders } from "@/components/landing/landing-providers";
import { getLandingAccountStateAction } from "@/app/actions";

type LandingAccountState = Awaited<ReturnType<typeof getLandingAccountStateAction>>;

/* ---------------- Hero ---------------- */
function Hero({ account }: { account: LandingAccountState | null }) {
  const { t } = useI18n();
  const { view } = useView();
  const h = view === "traveler" ? t.hero.traveler : t.hero.admin;
  const dashboardHref = account?.signedIn ? account.redirectTo : null;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero" />
      <div className="absolute inset-0 -z-10 grid-bg opacity-50" />
      <div
        className="absolute -z-10 top-[-10%] left-[-10%] h-[400px] sm:h-[500px] w-[400px] sm:w-[500px] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, oklch(0.52 0.24 270 / 0.45), transparent 70%)" }}
      />
      <div
        className="absolute -z-10 top-[20%] right-[-15%] h-[500px] sm:h-[600px] w-[500px] sm:w-[600px] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.15 175 / 0.45), transparent 70%)" }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 text-center">
        {/* Centered tab switcher */}
        <div className="flex justify-center">
          <ViewSwitcher />
        </div>

        <div key={view} className="animate-fade-in">
          <h1 className="mt-7 sm:mt-9 text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-[-0.045em] text-ink leading-[1.02] text-balance">
            {h.title1}
            <br />
            <span className="font-serif italic font-normal text-primary">{h.title2}</span>
          </h1>

          <p className="mx-auto mt-5 sm:mt-6 max-w-xl text-base sm:text-lg text-muted-foreground text-balance">
            {h.sub}
          </p>

          {/* View-specific CTAs */}
          <div className="mt-7 sm:mt-9">
            {dashboardHref ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap gap-2.5 justify-center">
                  <Button asChild size="sm" className="h-10 px-5 text-sm bg-ink text-background hover:opacity-90 rounded-full shadow-elegant">
                    <Link href={dashboardHref}>Open dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
                {view === "traveler" && <StoreButtons />}
              </div>
            ) : view === "traveler" ? (
              <div className="flex flex-col items-center gap-4">
                <StoreButtons />
                <p className="text-xs text-muted-foreground">
                  or{" "}
                  <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
                    log in on the web
                  </Link>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap gap-2.5 justify-center">
                  <Button asChild size="sm" className="h-10 px-5 text-sm bg-ink text-background hover:opacity-90 rounded-full shadow-elegant">
                    <Link href="/register">{h.cta1} <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-10 px-5 text-sm rounded-full glass border-border">
                    <Link href="/login">{h.cta2}</Link>
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">{h.caption}</p>
              </div>
            )}
          </div>

          {/* Combined visual: mobile + dashboard together */}
          <div className="mt-12 sm:mt-16 relative">
            <CombinedVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Visual swaps based on active view */
function CombinedVisual() {
  const { view } = useView();
  return (
    <div key={view} className="relative animate-fade-in">
      {view === "admin" ? (
        <div className="max-w-5xl mx-auto">
          <AdminMockup />
        </div>
      ) : (
        <div className="flex justify-center">
          <TravelerMockup />
        </div>
      )}
    </div>
  );
}

/* ---------------- Workflow: parallel lanes with handoff bridge ---------------- */
function Workflow() {
  const { t } = useI18n();
  const travelerIcons = [ScanLine, FolderTree, Send, Wallet];
  const adminIcons = [Inbox, Eye, ThumbsUp, FileSpreadsheet];

  return (
    <section id="workflow" className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 30%, oklch(0.52 0.24 270 / 0.10), transparent 70%), radial-gradient(50% 50% at 80% 70%, oklch(0.78 0.15 175 / 0.12), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            {t.workflow.kicker}
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink text-balance">
            {t.workflow.title1}{" "}
            <span className="font-serif italic font-normal text-primary">{t.workflow.title2}</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">{t.workflow.sub}</p>
        </div>

        {/* Two parallel lanes with handoff bridge */}
        <div className="mt-14 sm:mt-20 relative">
          <Lane
            label={t.workflow.laneTraveler}
            icon={Smartphone}
            accent="primary"
            steps={t.workflow.traveler}
            stepIcons={travelerIcons}
            side="top"
          />

          {/* Handoff bridge: connects traveler step 3 (Submit) to admin step 1 (Receive) */}
          <HandoffBridge
            label={t.workflow.handoff}
            desc={t.workflow.handoffDesc}
          />

          <Lane
            label={t.workflow.laneAdmin}
            icon={BarChart3}
            accent="mint"
            steps={t.workflow.admin}
            stepIcons={adminIcons}
            side="bottom"
          />
        </div>
      </div>
    </section>
  );
}

function Lane({
  label, icon: Icon, accent, steps, stepIcons, side,
}: {
  label: string;
  icon: typeof Smartphone;
  accent: "primary" | "mint";
  steps: { t: string; d: string }[];
  stepIcons: typeof Smartphone[];
  side: "top" | "bottom";
}) {
  const isMint = accent === "mint";
  return (
    <div className="relative">
      {/* Sticky lane label */}
      <div className="flex items-center gap-3 mb-5 sm:mb-7">
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${isMint ? "bg-gradient-mint" : "bg-gradient-primary"} shadow-elegant`}>
          <Icon className="h-4 w-4 text-background" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-ink">{label}</h3>
        <div className={`flex-1 h-px ${isMint ? "bg-mint/30" : "bg-primary/30"}`} />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {side === "top" ? "01 → 04" : "05 → 08"}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 relative">
        {steps.map((s, i) => {
          const StepIcon = stepIcons[i];
          const num = side === "top" ? i + 1 : i + 5;
          return (
            <div
              key={s.t}
              className="relative anim-slide-up group"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="glass rounded-3xl p-5 shadow-soft hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 relative overflow-hidden h-full">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-muted-foreground">
                    {String(num).padStart(2, "0")}
                  </div>
                  <div className="relative">
                    <span className={`absolute inset-0 rounded-full pulse-ring ${isMint ? "bg-mint/40" : "bg-primary/40"}`} />
                    <div className={`relative h-10 w-10 rounded-full grid place-items-center shadow-elegant ${isMint ? "bg-gradient-mint" : "bg-gradient-primary"}`}>
                      <StepIcon className="h-4 w-4 text-background" />
                    </div>
                  </div>
                </div>
                <h4 className="mt-5 text-base sm:text-lg font-semibold text-ink">{s.t}</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
                {/* subtle shimmer line */}
                <div className={`absolute bottom-0 left-0 right-0 h-px ${isMint ? "bg-gradient-mint" : "bg-gradient-primary"} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HandoffBridge({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="relative my-8 sm:my-10">
      {/* vertical connector line, centered */}
      <div className="hidden md:flex justify-center">
        <div className="relative w-[2px] h-12">
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-mint to-mint" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary via-mint to-mint blur-[3px] opacity-60" />
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative inline-flex items-center gap-3 glass-strong rounded-full px-5 py-2.5 shadow-elegant">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
          </span>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink">{label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground hidden sm:inline">{desc}</span>
          </div>
        </div>
      </div>

      {/* mobile: simple chevron */}
      <div className="md:hidden flex justify-center mt-3 text-muted-foreground">
        <ArrowRight className="h-4 w-4 rotate-90" />
      </div>
    </div>
  );
}

/* ---------------- Problem ---------------- */
function Problem() {
  const { t } = useI18n();
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <div className="lg:col-span-5">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink text-balance">
            {t.problem.title1} <span className="font-serif italic font-normal text-primary">{t.problem.title2}</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground">{t.problem.sub}</p>
        </div>
        <ul className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
          {t.problem.pains.map((p: string, i: number) => (
            <li key={p} className="glass rounded-2xl p-5 flex items-start gap-3">
              <span className="text-xs font-mono text-muted-foreground mt-1">0{i + 1}</span>
              <span className="text-base font-medium text-ink">{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */
function Features() {
  const { t } = useI18n();
  const icons = [Camera, Briefcase, CreditCard, FolderLock, Users, Smartphone];
  return (
    <section id="features" className="relative">
      <div className="absolute inset-0 -z-10 grid-bg opacity-30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink text-balance">
            {t.features.title1}{" "}
            <span className="font-serif italic font-normal text-primary">{t.features.title2}</span>
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.features.items.map(([title, desc]: [string, string], i: number) => {
            const Icon = icons[i];
            return (
              <div
                key={title}
                className="group glass rounded-3xl p-6 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-mint/30 grid place-items-center group-hover:bg-gradient-primary transition-colors">
                  <Icon className="h-5 w-5 text-ink group-hover:text-background transition-colors" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCTA({ account }: { account: LandingAccountState | null }) {
  const { t } = useI18n();
  const dashboardHref = account?.signedIn ? account.redirectTo : null;
  return (
    <section className="px-4 sm:px-6 pb-20 sm:pb-24">
      <div className="mx-auto max-w-6xl rounded-[2rem] p-10 sm:p-14 md:p-20 text-center relative overflow-hidden glass shadow-elegant">
        <div
          className="absolute -top-32 -left-32 h-[300px] sm:h-[400px] w-[300px] sm:w-[400px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, oklch(0.52 0.24 270 / 0.5), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-[300px] sm:h-[400px] w-[300px] sm:w-[400px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, oklch(0.78 0.15 175 / 0.5), transparent 70%)" }}
        />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-[-0.03em] text-ink text-balance">
            {t.final.title1}
            <br />
            <span className="font-serif italic font-normal text-primary">{t.final.title2}</span>
          </h2>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">{t.final.sub}</p>
          <div className="mt-8 sm:mt-10 flex flex-wrap gap-2.5 justify-center">
            <Button asChild size="sm" className="h-10 px-5 rounded-full bg-ink text-background hover:opacity-90 shadow-elegant">
              <a href={dashboardHref ?? "/register"}>{dashboardHref ? "Open dashboard" : t.final.cta1} <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
            {!dashboardHref && (
              <Button asChild size="sm" variant="outline" className="h-10 px-5 rounded-full glass border-border">
                <a href="/login">{t.final.cta2}</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Index() {
  const [account, setAccount] = useState<LandingAccountState>({ signedIn: false });

  useEffect(() => {
    let active = true;
    getLandingAccountStateAction()
      .then((state) => {
        if (active) setAccount(state);
      })
      .catch(() => {
        if (active) setAccount({ signedIn: false });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader account={account} />
      <main>
        <Hero account={account} />
        <Workflow />
        <Problem />
        <Features />
        <FinalCTA account={account} />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function Page() {
  return (
    <LandingProviders>
      <Index />
    </LandingProviders>
  );
}
