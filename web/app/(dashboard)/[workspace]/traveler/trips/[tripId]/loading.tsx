import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function TravelerTripDetailLoading() {
  return (
    <AppShell role="traveler">
      <section className="w-full space-y-5">
        <Skeleton className="h-28 w-full rounded-[var(--radius)]" />
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
        <div className="card space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-22 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-t border-border/60">
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="card space-y-3">
          <Skeleton className="h-5 w-24" />
          {[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      </section>
    </AppShell>
  );
}
