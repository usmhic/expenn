import { Camera, FileImage, ReceiptText, Sparkles, Zap } from "lucide-react";
import { cookies } from "next/headers";
import { createExpenseAction, previewReceiptExtractionAction } from "@/app/actions";
import { AppShell } from "@/components/layout/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { apiClient } from "@/lib/api-client";

export default async function CapturePage() {
  const api = apiClient({ cookie: (await cookies()).toString() });
  const trips = await api.trips.list({ mine: true });
  const extraction = await previewReceiptExtractionAction();

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Capture" }]}>
      <section className="grid w-full gap-4 lg:grid-cols-[1fr_0.72fr]">
        {/* Upload form */}
        <article className="card">
          <div className="flex items-start gap-3 mb-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <Camera className="size-5" />
            </span>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-primary">Receipt capture</p>
              <h1 className="text-lg font-bold">Upload once, keep the audit trail</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Receipt files are stored securely and attached to the expense draft for finance review.
              </p>
            </div>
          </div>

          <form action={createExpenseAction} className="grid gap-3">
            <label className="block text-sm font-medium">
              Receipt image or PDF
              <input name="receipt" type="file" accept="image/*,application/pdf" className="form-control mt-1" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Merchant
                <input name="merchant" required defaultValue={extraction.merchant} className="form-control mt-1" />
              </label>
              <label className="block text-sm font-medium">
                Amount
                <input name="amount" type="number" min="0.01" step="0.01" required defaultValue={extraction.total} className="form-control mt-1" />
              </label>
              <label className="block text-sm font-medium">
                Currency
                <input name="currency" required defaultValue={extraction.currency} className="form-control mt-1 uppercase" />
              </label>
              <label className="block text-sm font-medium">
                Category
                <input name="category" required defaultValue="Meals" className="form-control mt-1" />
              </label>
              <label className="block text-sm font-medium">
                Date
                <input name="date" type="date" required defaultValue={extraction.date} className="form-control mt-1" />
              </label>
              <label className="block text-sm font-medium">
                Trip
                <select name="tripId" defaultValue="" className="form-control mt-1">
                  <option value="">No trip</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>{trip.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <textarea name="notes" placeholder="Notes for finance" className="form-control min-h-[4rem]" />
            <SubmitButton pendingText="Uploading receipt..." className="primary-button rounded-md">
              <ReceiptText className="size-4" />
              Save expense draft
            </SubmitButton>
          </form>
        </article>

        {/* AI extraction preview */}
        <article className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold">AI extraction preview</h2>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileImage className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold">{extraction.message}</p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              OCR is ready for a provider integration. The form is prefilled with demo values so the capture workflow can be exercised end to end.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <PreviewMetric label="Merchant" value={extraction.merchant} />
            <PreviewMetric label="Total" value={`${extraction.currency} ${extraction.total?.toFixed(2)}`} />
            <PreviewMetric label="Tax" value={`${extraction.currency} ${extraction.tax?.toFixed(2)}`} />
            <PreviewMetric label="Confidence" value={`${Math.round((extraction.confidenceScore ?? 0) * 100)}%`} />
          </dl>

          <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-center">
            <Zap className="mx-auto size-5 text-primary/60 mb-1.5" />
            <p className="text-xs text-muted-foreground">Connect an OCR provider (Mindee, Veryfi, etc.) to auto-fill receipts in production.</p>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function PreviewMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-secondary/60 p-2.5">
      <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}
