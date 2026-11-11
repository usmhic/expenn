import { AppShell } from "@/components/layout/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state shared by app pages: header, a row of tiles, then content blocks. */
export function PageSkeleton({
  role,
  variant = "list",
}: {
  role: "admin" | "manager" | "traveler";
  variant?: "list" | "planner" | "form";
}) {
  return (
    <AppShell role={role}>
      <div className="page-header" aria-busy="true" aria-label="Loading">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      {variant !== "form" && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      )}
      {variant === "planner" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
          <div className="card space-y-3">
            <Skeleton className="h-10 w-full" />
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
          <Skeleton className="order-first h-[44vh] min-h-[300px] rounded-2xl lg:order-none lg:h-[32rem]" />
        </div>
      ) : variant === "form" ? (
        <div className="card max-w-2xl space-y-4">
          <Skeleton className="h-36 w-full" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="card card-flush">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
