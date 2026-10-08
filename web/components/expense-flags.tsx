import { AlertTriangle, Copy, ImageOff } from "lucide-react";
import { FLAG_LABELS } from "@/lib/expenses";
import { cn } from "@/lib/utils";

const FLAG_ICONS: Record<string, typeof AlertTriangle> = {
  missing_receipt: ImageOff,
  possible_duplicate: Copy,
};

/** Small, non-blocking review hints computed by the API. */
export function FlagChips({ flags, className }: { flags?: string[]; className?: string }) {
  if (!flags || flags.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {flags.map((flag) => {
        const meta = FLAG_LABELS[flag] ?? { label: flag.replace(/_/g, " "), hint: "" };
        const Icon = FLAG_ICONS[flag] ?? AlertTriangle;
        return (
          <span
            key={flag}
            title={meta.hint}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[0.65rem] font-medium",
              flag === "possible_duplicate"
                ? "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"
            )}
          >
            <Icon className="size-2.5" />
            {meta.label}
          </span>
        );
      })}
    </span>
  );
}
