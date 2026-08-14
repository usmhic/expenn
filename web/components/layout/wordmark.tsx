import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type WordmarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function Wordmark({ className, iconClassName, textClassName }: WordmarkProps) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("brand-icon-mark size-9 rounded-xl", iconClassName)}>
        <Image src="/icon.png" alt="" width={48} height={48} className="size-full object-contain" />
      </span>
      <span
        className={cn("font-display text-2xl font-bold leading-none text-ink", textClassName)}
        style={{ fontVariationSettings: "'wght' 700" }}
      >
        xpenn
      </span>
    </Link>
  );
}
