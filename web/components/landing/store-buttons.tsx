import { Apple, Play } from "lucide-react";

export function StoreButtons() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <a
        href="mailto:hi@expenn.com?subject=iOS%20app"
        className="group flex items-center gap-2 h-10 px-3.5 rounded-xl bg-ink text-background hover:opacity-90 transition shadow-elegant"
      >
        <Apple className="h-4 w-4" />
        <div className="text-left leading-tight">
          <div className="text-[8px] uppercase tracking-wider opacity-70">Download on the</div>
          <div className="text-xs font-semibold">App Store</div>
        </div>
      </a>
      <a
        href="mailto:hi@expenn.com?subject=Android%20app"
        className="group flex items-center gap-2 h-10 px-3.5 rounded-xl bg-ink text-background hover:opacity-90 transition shadow-elegant"
      >
        <Play className="h-4 w-4 fill-current" />
        <div className="text-left leading-tight">
          <div className="text-[8px] uppercase tracking-wider opacity-70">Get it on</div>
          <div className="text-xs font-semibold">Google Play</div>
        </div>
      </a>
    </div>
  );
}
