import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/navigation";

export default function CaptureLoading() {
  return (
    <AppShell role="traveler">
      <section className="mx-auto w-full max-w-xl space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </section>
    </AppShell>
  );
}
