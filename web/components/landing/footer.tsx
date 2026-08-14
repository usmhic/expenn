import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "../layout/wordmark";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-14 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Wordmark />
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">{t.footer.tag}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink">{t.footer.product}</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/#features" className="hover:text-foreground">{t.nav.features}</Link></li>
            <li><Link href="/#pricing" className="hover:text-foreground">{t.nav.pricing}</Link></li>
            <li><Link href="/#workflow" className="hover:text-foreground">{t.nav.how}</Link></li>
            <li><a href="mailto:hi@expenn.com" className="hover:text-foreground">{t.nav.contact}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink">{t.footer.legal}</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy" className="hover:text-foreground">{t.footer.privacy}</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">{t.footer.terms}</Link></li>
            <li><a href="mailto:hi@expenn.com" className="hover:text-foreground">hi@expenn.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>{t.footer.copy}</span>
          <span>{t.footer.made}</span>
        </div>
      </div>
    </footer>
  );
}
