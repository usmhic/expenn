import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  href?: string;
  /** Show only the "e" mark (collapsed sidebar, tight headers). */
  compact?: boolean;
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-mark size-8", className)}>
      <Image src="/mark.png" alt="" width={64} height={64} priority />
    </span>
  );
}

export function Wordmark({ className, iconClassName, textClassName, href = "/", compact }: WordmarkProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Expenn home">
      <BrandMark className={iconClassName} />
      {!compact && (
        <span className={cn("font-display text-[1.375rem] font-semibold leading-none tracking-tight text-ink", textClassName)}>
          expenn
        </span>
      )}
    </Link>
  );
}
