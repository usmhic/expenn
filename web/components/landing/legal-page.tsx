"use client";

import Link from "next/link";
import { ArrowLeft, Mail, ScrollText, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";
import { LandingProviders } from "./landing-providers";

const EMAIL = "hi@expenn.com";

function renderWithEmail(text: string) {
  return text.split(/(hi@expenn\.com)/g).map((part, i) =>
    part === EMAIL ? (
      <a key={i} href={`mailto:${EMAIL}`} className="font-medium text-primary underline-offset-4 hover:underline">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Legal({ doc }: { doc: "privacy" | "terms" }) {
  const { t } = useI18n();
  const content = t[doc];
  const Icon = doc === "privacy" ? ShieldCheck : ScrollText;
  const anchor = (i: number) => `${doc}-section-${i + 1}`;

  return (
    <div className="lp flex min-h-screen flex-col overflow-x-clip bg-canvas">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-10 bg-hero" aria-hidden />
          <div
            className="absolute inset-0 -z-10 grid-bg [mask-image:radial-gradient(70%_80%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="lp-container py-14 sm:py-20">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t.common.backHome}
            </Link>
            <div className="mt-8 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-border bg-card text-primary shadow-xs">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-sm text-muted-foreground">
                {t.common.lastUpdated}: <span className="font-medium text-foreground">{content.date}</span>
              </span>
            </div>
            <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl">
              {content.title}
            </h1>
            <p className="lp-lead mt-4 max-w-2xl">{content.sub}</p>
          </div>
        </section>

        <div className="lp-container grid gap-10 py-14 sm:py-20 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <nav aria-label={t.common.onThisPage} className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{t.common.onThisPage}</p>
              <ol className="mt-4 space-y-1 border-l border-border">
                {content.sections.map((s, i) => (
                  <li key={s.h}>
                    <a
                      href={`#${anchor(i)}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      {s.h}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="min-w-0 max-w-3xl">
            <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-xs">
              {content.sections.map((s, i) => (
                <section key={s.h} id={anchor(i)} className="scroll-mt-24 p-6 sm:p-8">
                  <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{s.h}</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{renderWithEmail(s.p)}</p>
                </section>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">{t.common.questions}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.common.questionsBody}</p>
              </div>
              <a href={`mailto:${EMAIL}`} className="secondary-button">
                <Mail className="size-4" aria-hidden />
                {EMAIL}
              </a>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  return (
    <LandingProviders>
      <Legal doc={doc} />
    </LandingProviders>
  );
}
