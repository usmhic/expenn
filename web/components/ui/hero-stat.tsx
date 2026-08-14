import { cn } from "@/lib/utils";

type Highlight = "over" | "warn" | boolean | undefined;

function highlightClasses(h: Highlight) {
  if (h === "over" || h === true)
    return {
      wrap: "border-rose-200 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-400/10",
      val: "text-rose-700 dark:text-rose-300",
    };
  if (h === "warn")
    return {
      wrap: "border-amber-200 bg-amber-50/80 dark:border-amber-400/20 dark:bg-amber-400/10",
      val: "text-amber-700 dark:text-amber-300",
    };
  return { wrap: "border-border bg-secondary/55", val: "" };
}

export function HeroStat({
  label,
  value,
  highlight,
  className,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: Highlight;
  className?: string;
}) {
  const { wrap, val } = highlightClasses(highlight);
  return (
    <span className={cn("flex min-w-[7rem] flex-col rounded-lg border px-3 py-2", wrap, className)}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("mt-0.5 truncate text-base font-bold", val)}>{value}</span>
    </span>
  );
}
