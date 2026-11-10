import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("page-header", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="page-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("empty-state", className)}>
      <span className="empty-state-icon"><Icon className="size-5" /></span>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-text">{description}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "mint" | "warning" | "danger";
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <span className="stat-label">
        {Icon && (
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground",
              tone === "primary" && "bg-accent text-primary",
              tone === "mint" && "bg-mint/15 text-teal-700 dark:text-teal-300",
              tone === "warning" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
              tone === "danger" && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
        {label}
      </span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={cn("stat card-interactive", className)}>{content}</Link>
  ) : (
    <div className={cn("stat", className)}>{content}</div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("card card-flush", className)}>
      <div className="card-header">
        <div className="min-w-0">
          <h2 className="card-title">{title}</h2>
          {description && <p className="card-subtitle">{description}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
