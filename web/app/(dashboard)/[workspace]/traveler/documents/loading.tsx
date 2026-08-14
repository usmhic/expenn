import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function TravelerDocumentsLoading() {
  return (
    <AppShell role="traveler">
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg lg:col-span-2" />
        </div>
      </section>
    </AppShell>
  );
}
