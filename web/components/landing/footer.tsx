"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/layout/wordmark";
import { useI18n } from "@/lib/i18n";
import { GithubIcon } from "./icons";
import { DEMO_URL, DOCS_URL, GITHUB_URL } from "./links";

type FooterLink = { href: string; label: string; external?: boolean };

export function SiteFooter() {
  const { t } = useI18n();

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: t.footer.product,
      links: [
        { href: "/#how", label: t.footer.howItWorks },
        { href: "/#trips", label: t.nav.trips },
        { href: "/#security", label: t.nav.security },
        { href: "/#faq", label: t.nav.faq },
      ],
    },
    {
      title: t.footer.resources,
      links: [
        { href: DOCS_URL, label: t.footer.docs },
        { href: GITHUB_URL, label: t.footer.github, external: true },
        { href: DEMO_URL, label: t.footer.demo, external: true },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: "/privacy", label: t.footer.privacy },
        { href: "/terms", label: t.footer.terms },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="lp-container grid gap-10 py-14 sm:py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.footer.tag}</p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button button-sm mt-5"
          >
            <GithubIcon className="size-4" />
            {t.hero.ctaGithub}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:contents">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-ink">{col.title}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                        <ArrowUpRight className="size-3.5 text-subtle" aria-hidden />
                      </a>
                    ) : (
                      <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="lp-container flex flex-col gap-2 py-6 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t.footer.copy}</span>
          <span>{t.footer.credits}</span>
        </div>
      </div>
    </footer>
  );
}
