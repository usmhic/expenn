import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function TravelerHomeLoading() {
  return (
    <AppShell role="traveler">
      <section className="w-full space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        {/* Hero */}
        <Skeleton className="h-32 w-full rounded-[var(--radius)]" />
        {/* Two-column */}
        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
              <Skeleton className="h-4 w-20" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/60">
                <Skeleton className="size-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="card space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
              </div>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <Skeleton className="h-4 w-28" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/60">
                  <Skeleton className="size-7 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
