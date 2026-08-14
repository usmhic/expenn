import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <main className="app-surface min-h-dvh px-4 py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-2xl" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="size-9 rounded-md" />
        </div>
        <div className="mb-6 space-y-2 text-center">
          <Skeleton className="mx-auto h-7 w-64" />
          <Skeleton className="mx-auto h-4 w-80 max-w-full" />
        </div>
        <section className="card p-5">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <Skeleton className="my-4 h-4 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </section>
      </div>
    </main>
  );
}
