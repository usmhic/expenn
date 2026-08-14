import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function AnalyticsLoading() {
  return (
    <AppShell role="admin">
      <section className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card space-y-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-[var(--radius)]" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
          <Skeleton className="h-64 rounded-[var(--radius)]" />
        </div>
        <Skeleton className="h-80 rounded-[var(--radius)]" />
        <Skeleton className="h-64 rounded-[var(--radius)]" />
      </section>
    </AppShell>
  );
}
