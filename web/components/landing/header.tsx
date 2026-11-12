"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DOCS_URL, type LandingAccountState } from "./links";

const LANGS: Lang[] = ["en", "es"];

export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={cn("inline-flex h-9 items-center rounded-[calc(var(--radius)-2px)] border border-border bg-card p-0.5 shadow-xs", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cn(
            "h-full rounded-[calc(var(--radius)-5px)] px-2.5 text-xs font-semibold uppercase tracking-wide transition-colors",
            lang === l ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({ account }: { account?: LandingAccountState | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(account?.signedIn);
  const ctaHref = signedIn ? account?.redirectTo ?? "/login" : "/register";
  const ctaLabel = signedIn ? t.nav.openDashboard : t.nav.getStarted;

  const links = [
    { href: "/#how", label: t.nav.product },
    { href: "/#trips", label: t.nav.trips },
    { href: "/#self-host", label: t.nav.selfHost },
    { href: "/#faq", label: t.nav.faq },
    { href: DOCS_URL, label: t.nav.docs },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="lp-header sticky top-0 z-50 border-b border-border">
      <div className="lp-container flex h-16 items-center justify-between gap-3">
        <Wordmark className="shrink-0" />

        <nav aria-label={t.nav.primary} className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitch className="hidden sm:inline-flex" />
          <ThemeToggle />
          {!signedIn && (
            <Link href="/login" className="ghost-button button-sm hidden lg:inline-flex">
              {t.nav.signIn}
            </Link>
          )}
          <Link href={ctaHref} className="primary-button button-sm">
            {ctaLabel}
            <ArrowRight className="hidden size-3.5 sm:block" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="icon-button lg:hidden"
            aria-expanded={open}
            aria-controls="lp-mobile-menu"
            aria-label={open ? t.nav.close : t.nav.menu}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="lp-mobile-menu" className="animate-fade-in border-t border-border bg-canvas lg:hidden">
          <nav aria-label={t.nav.primary} className="lp-container flex flex-col py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-border py-3.5 text-base font-medium text-foreground last:border-b-0"
              >
                {l.label}
                <ArrowRight className="size-4 text-subtle" aria-hidden />
              </Link>
            ))}
          </nav>
          <div className="lp-container flex flex-col gap-3 border-t border-border py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.nav.language}</span>
              <LanguageSwitch />
            </div>
            {!signedIn && (
              <Link href="/login" onClick={() => setOpen(false)} className="secondary-button w-full">
                {t.nav.signIn}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
