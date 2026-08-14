import { useView, type View } from "@/lib/view";
import { useI18n } from "@/lib/i18n";
import { Smartphone, BarChart3 } from "lucide-react";

export function ViewSwitcher({ size = "md" }: { size?: "sm" | "md" }) {
  const { view, setView } = useView();
  const { t } = useI18n();
  const labels: Record<View, string> = { traveler: t.hero.tabTraveler, admin: t.hero.tabAdmin };
  const icons: Record<View, typeof Smartphone> = { traveler: Smartphone, admin: BarChart3 };
  const h = size === "sm" ? "h-9" : "h-11";
  const px = size === "sm" ? "px-3.5" : "px-5";
  const text = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className={`relative inline-flex items-center p-1 rounded-full glass shadow-soft`} role="tablist">
      <span
        aria-hidden
        className={`absolute top-1 bottom-1 rounded-full bg-ink shadow-elegant transition-all duration-300 ease-out`}
        style={{
          left: view === "traveler" ? "4px" : "50%",
          right: view === "admin" ? "4px" : "50%",
        }}
      />
      {(["traveler", "admin"] as const).map((k) => {
        const Icon = icons[k];
        const active = view === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            onClick={() => setView(k)}
            className={`relative z-10 ${h} ${px} ${text} font-semibold rounded-full transition-colors flex items-center gap-1.5 ${
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {labels[k]}
          </button>
        );
      })}
    </div>
  );
}
