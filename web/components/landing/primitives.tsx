import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Eyebrow({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="lp-eyebrow">
      {icon && <span className="grid size-6 place-items-center rounded-md bg-accent text-accent-foreground [&_svg]:size-3.5">{icon}</span>}
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  icon,
  title,
  sub,
  align = "left",
  className,
  id,
}: {
  eyebrow: string;
  icon?: ReactNode;
  title: ReactNode;
  sub?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl", className)}>
      <Eyebrow icon={icon}>{eyebrow}</Eyebrow>
      <h2 id={id} className="lp-h2 mt-4">
        {title}
      </h2>
      {sub && <p className={cn("lp-lead mt-5", align === "center" && "mx-auto max-w-2xl")}>{sub}</p>}
    </div>
  );
}

export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint/15 text-foreground ring-1 ring-mint/40 ring-inset">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
