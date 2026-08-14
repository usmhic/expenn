'use client';

import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/landing/header";
import { LandingProviders } from "@/components/landing/landing-providers";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full blur-3xl opacity-30 -z-10"
        style={{ background: "radial-gradient(circle, oklch(0.52 0.24 270 / 0.4), transparent 70%)" }}
      />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition">
          <ArrowLeft className="h-4 w-4" /> {t.common.backHome}
        </Link>

        <div className="glass rounded-3xl p-8 sm:p-12 shadow-elegant">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center shadow-elegant">
              <ShieldCheck className="h-5 w-5 text-background" />
            </div>
            <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
              {t.common.lastUpdated}: {t.privacy.date}
            </span>
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-ink text-balance">
            {t.privacy.title}
          </h1>

          <div className="mt-10 space-y-8">
            {t.privacy.sections.map((s: { h: string; p: string }, i: number) => (
              <section key={i} className="relative pl-5 border-l-2 border-border hover:border-primary/50 transition">
                <h2 className="text-lg font-semibold text-ink">{s.h}</h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">{renderWithEmail(s.p)}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function Page() {
  return (
    <LandingProviders>
      <PrivacyPage />
    </LandingProviders>
  );
}

function renderWithEmail(text: string) {
  const parts = text.split(/(hi@expenn\.com)/g);
  return parts.map((p, i) =>
    p === "hi@expenn.com" ? (
      <a key={i} href="mailto:hi@expenn.com" className="text-primary underline-offset-4 hover:underline">
        {p}
      </a>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
