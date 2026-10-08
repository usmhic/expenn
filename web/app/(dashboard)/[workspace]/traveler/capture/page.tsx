import { Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { CaptureForm } from "@/components/capture-form";
import { apiClient } from "@/lib/api-client";

const TIPS = [
  "Photograph the whole receipt on a flat, dark surface.",
  "For hotels, upload the itemised folio — not the card slip.",
  "Add who attended for client meals; reviewers will ask.",
  "Paid with a company card? Untick “Pay me back”.",
];

export default async function CapturePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [trips, expenses] = await Promise.all([
    api.trips.list({ mine: true }),
    api.expenses.list({ mine: true }),
  ]);

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Capture" }]}>
      <section className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="card">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Camera className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold">Capture a receipt</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Snap it now, while you still have it. The date and your active trip are filled in for you.
              </p>
            </div>
          </div>
          <CaptureForm
            trips={trips}
            defaultCurrency={expenses[0]?.currency}
            expensesHref={`/${workspace}/traveler/expenses`}
          />
        </article>

        <aside className="space-y-4">
          <article className="card">
            <h2 className="mb-3 text-sm font-semibold">Get approved the first time</h2>
            <ul className="space-y-2.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <div className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                Receipts are stored in your organisation&apos;s own storage and are only visible to you and your reviewers.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
