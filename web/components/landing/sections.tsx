"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CodeXml,
  Copy,
  FileDown,
  FolderLock,
  MailCheck,
  Plus,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { BrandMark } from "@/components/layout/wordmark";
import { useI18n } from "@/lib/i18n";
import { GithubIcon } from "./icons";
import { DEMO_URL, DOCS_URL, GITHUB_URL, ISSUES_URL, type LandingAccountState } from "./links";
import { SectionHeading } from "./primitives";

/* ── Security ────────────────────────────────────────────────────────────── */

const SECURITY_ICONS = [Server, MailCheck, ShieldCheck, CodeXml, FolderLock, FileDown];

export function SecuritySection() {
  const { t } = useI18n();
  return (
    <section id="security" className="scroll-mt-20 border-t border-border bg-card py-20 sm:py-28" aria-labelledby="lp-security-title">
      <div className="lp-container">
        <SectionHeading
          id="lp-security-title"
          eyebrow={t.security.eyebrow}
          icon={<ShieldCheck />}
          title={t.security.title}
          sub={t.security.sub}
        />
        <ul className="mt-12 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {t.security.items.map((item, i) => {
            const Icon = SECURITY_ICONS[i] ?? Server;
            return (
              <li key={item.t} className="rounded-2xl border border-border bg-canvas p-6 transition-shadow hover:shadow-soft">
                <span className="grid size-10 place-items-center rounded-xl border border-border bg-card text-primary shadow-xs">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-ink">{item.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── Self-host ───────────────────────────────────────────────────────────── */

const COMMANDS = [
  "git clone https://github.com/usmhic/expenn.git && cd expenn",
  "cp .env.example .env",
  "docker compose up --build",
];

const SERVICES = ["db", "minio", "rabbitmq", "api", "web"];

export function SelfHostSection() {
  const { t } = useI18n();
  const s = t.selfHost;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMANDS.join("\n"));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section id="self-host" className="lp-band scroll-mt-16 py-20 sm:py-28" aria-labelledby="lp-selfhost-title">
      <div className="lp-container grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <p className="lp-eyebrow text-mint">
            <span className="grid size-6 place-items-center rounded-md bg-white/10 text-mint">
              <CodeXml className="size-3.5" aria-hidden />
            </span>
            {s.eyebrow}
          </p>
          <h2 id="lp-selfhost-title" className="lp-h2 mt-4 text-[var(--lp-band-fg)]">
            {s.title}
          </h2>
          <p className="lp-lead mt-5 text-[var(--lp-band-muted)]">{s.sub}</p>

          <ol className="mt-8 space-y-5">
            {s.steps.map((step, i) => (
              <li key={step.t} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--lp-band-border)] bg-white/5 font-mono text-xs font-semibold text-[var(--lp-band-fg)]">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="text-[0.9375rem] font-semibold text-[var(--lp-band-fg)]">{step.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--lp-band-muted)]">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex flex-col gap-3 min-[480px]:flex-row">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button button-lg !bg-white !text-[oklch(0.19_0.04_268)] hover:!bg-white/90"
            >
              <GithubIcon className="size-4" />
              {s.github}
            </a>
            <Link
              href={DOCS_URL}
              className="secondary-button button-lg !border-[var(--lp-band-border)] !bg-white/5 !text-[var(--lp-band-fg)] !shadow-none hover:!bg-white/10"
            >
              <BookOpen className="size-4" aria-hidden />
              {s.docs}
            </Link>
          </div>
        </div>

        <div className="lp-code min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--lp-band-border)] px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--lp-band-muted)]">
              <Terminal className="size-3.5" aria-hidden />
              {s.terminal}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--lp-band-border)] px-2.5 text-[11px] font-medium text-[var(--lp-band-fg)] transition-colors hover:bg-white/10"
            >
              {copied ? <Check className="size-3.5 text-mint" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              <span aria-live="polite">{copied ? s.copied : s.copy}</span>
            </button>
          </div>
          <pre className="scrollbar-none overflow-x-auto p-5 font-mono text-[12.5px] leading-7 text-[oklch(0.9_0.01_264)] sm:p-6 sm:text-[13px]">
            <code>
              <span className="text-[oklch(0.62_0.03_266)]">$ </span>
              {COMMANDS[0]}
              {"\n"}
              <span className="text-[oklch(0.62_0.03_266)]">$ </span>
              {COMMANDS[1]}
              {"\n"}
              <span className="text-[oklch(0.62_0.03_266)]">{s.comment}</span>
              {"\n"}
              <span className="text-[oklch(0.62_0.03_266)]">$ </span>
              {COMMANDS[2]}
              {"\n\n"}
              {SERVICES.map((svc) => (
                <span key={svc}>
                  <span className="text-mint">✓</span> {svc}
                  {"  "}
                </span>
              ))}
              {"\n"}
              <span className="text-[oklch(0.78_0.12_264)]">→ </span>
              {s.ready}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────────── */

export function FaqSection() {
  const { t } = useI18n();
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28" aria-labelledby="lp-faq-title">
      <div className="lp-container grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeading id="lp-faq-title" eyebrow={t.faq.eyebrow} title={t.faq.title} sub={t.faq.sub} />
          <div className="mt-8 flex flex-col items-start gap-3">
            <Link href={DOCS_URL} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline hover:underline-offset-4">
              <BookOpen className="size-4" aria-hidden />
              {t.faq.docs}
            </Link>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline hover:underline-offset-4"
            >
              <GithubIcon className="size-4" />
              {t.faq.issue}
            </a>
          </div>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {t.faq.items.map((item) => (
            <details key={item.q} className="lp-faq group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-muted/50 sm:px-6 sm:text-base">
                {item.q}
                <span className="lp-faq-icon grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform duration-200">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="-mt-1 px-5 pb-5 pr-12 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pr-16 sm:text-[0.9375rem]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────────── */

export function FinalCta({ account }: { account: LandingAccountState | null }) {
  const { t } = useI18n();
  const dashboardHref = account?.signedIn ? account.redirectTo ?? "/login" : null;
  return (
    <section className="pb-20 sm:pb-28" aria-labelledby="lp-final-title">
      <div className="lp-container">
        <div className="lp-gradient-ring relative isolate overflow-hidden rounded-[2rem] bg-card px-5 py-14 text-center shadow-soft sm:px-12 sm:py-20">
          <div className="absolute inset-0 -z-10 bg-hero" aria-hidden />
          <div className="absolute inset-0 -z-10 grid-bg [mask-image:radial-gradient(60%_70%_at_50%_50%,black,transparent)]" aria-hidden />
          <BrandMark className="mx-auto size-12" />
          <h2 id="lp-final-title" className="lp-h2 mx-auto mt-6 max-w-2xl">
            {t.final.title}
          </h2>
          <p className="lp-lead mx-auto mt-5 max-w-xl">{t.final.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 min-[480px]:flex-row min-[480px]:items-center">
            <Link href={dashboardHref ?? "/register"} className="primary-button button-lg shadow-elegant">
              {dashboardHref ? t.nav.openDashboard : t.final.ctaPrimary}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="secondary-button button-lg">
              {t.final.ctaDemo}
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
