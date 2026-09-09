import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ArrowRight, Menu, X } from "lucide-react";
import { Wordmark } from "../layout/wordmark";
import { HeaderToggles } from "./header-toggle";

type LandingAccountState = {
  signedIn: boolean;
  redirectTo?: string;
};

export function SiteHeader({ account }: { account?: LandingAccountState | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const dashboardHref = account?.redirectTo ?? "/login";

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="glass rounded-2xl px-4 sm:px-5 h-14 flex items-center justify-between shadow-soft">
          <Wordmark />

          <nav className="hidden lg:flex items-center justify-center gap-6 text-sm font-medium text-muted-foreground flex-1 px-6">
            <Link href="/#workflow" className="hover:text-foreground transition">{t.nav.how}</Link>
            <Link href="/#features" className="hover:text-foreground transition">{t.nav.features}</Link>
            <a href="mailto:hi@expenn.com" className="hover:text-foreground transition">{t.nav.contact}</a>
          </nav>

          <div className="flex items-center gap-2">
            <HeaderToggles />
            {account?.signedIn && (
              <Link href={dashboardHref} className="hidden sm:inline-flex primary-button h-9 px-3 text-sm">
                Dashboard
                <ArrowRight className="size-4" />
              </Link>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden h-9 w-9 rounded-full glass grid place-items-center text-foreground"
              aria-label="Menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="lg:hidden mt-2 glass rounded-2xl p-4 shadow-soft animate-fade-in">
            <nav className="flex flex-col gap-3 text-sm font-medium">
              <Link href="/#workflow" onClick={() => setOpen(false)} className="text-foreground">{t.nav.how}</Link>
              <Link href="/#features" onClick={() => setOpen(false)} className="text-foreground">{t.nav.features}</Link>
              <a href="mailto:hi@expenn.com" className="text-foreground">{t.nav.contact}</a>
              {account?.signedIn && (
                <Link href={dashboardHref} onClick={() => setOpen(false)} className="primary-button mt-1 text-sm">Dashboard</Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
