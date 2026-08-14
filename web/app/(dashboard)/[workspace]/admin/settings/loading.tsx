import { AppShell } from "@/components/layout/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <AppShell role="admin">
      <section className="space-y-4">
        <Skeleton className="h-7 w-36" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </section>
    </AppShell>
  );
}
