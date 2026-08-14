import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function AdminTripDetailLoading() {
  return (
    <AppShell role="admin">
      <section className="w-full space-y-5">
        <Skeleton className="h-28 w-full rounded-[var(--radius)]" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="card space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        </div>
        <div className="card space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2"><Skeleton className="h-5 w-32" /></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-3 border-t border-border/60 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
