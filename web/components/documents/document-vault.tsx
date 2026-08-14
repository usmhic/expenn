import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { FileText, FileUp } from "lucide-react";
import { createDocumentAction } from "@/app/actions";
import { apiClient } from "@/lib/api-client";
import { getSignedInState } from "@/server/auth-redirect";
import { SubmitButton } from "@/components/ui/submit-button";

function maskNumber(value: string | null) {
  if (!value || value.length <= 4) return value ?? "—";
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export async function DocumentVault() {
  const state = await getSignedInState(await headers());
  if (!state) redirect("/login?error=session-required");

  const api = apiClient({ cookie: (await cookies()).toString() });
  const documents = await api.documents.list();
  const detailBase = `/${state.workspaceSlug}/traveler/documents`;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Store travel documents, IDs, and receipts.</p>
        </div>
        <a href="#upload" className="primary-button rounded-md text-sm">
          <FileUp className="size-4" />
          Add document
        </a>
      </div>

      <form id="upload" action={createDocumentAction} className="card">
        <h2 className="text-lg font-semibold">Upload document</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Title" className="form-control" />
          <select name="kind" defaultValue="other" className="form-control">
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="id_card">ID card</option>
            <option value="drivers_license">Driver&apos;s license</option>
            <option value="itinerary">Itinerary</option>
            <option value="receipt">Receipt</option>
            <option value="invoice">Invoice</option>
            <option value="contract">Contract</option>
            <option value="other">Other</option>
          </select>
          <input name="documentNumber" placeholder="Document number (optional)" className="form-control" />
          <input name="expiryDate" type="date" placeholder="Expiry date" className="form-control" />
          <input name="file" type="file" accept="image/*,application/pdf" className="form-control sm:col-span-2" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input name="isSensitive" type="checkbox" value="true" className="accent-primary" />
          Mark as sensitive
        </label>
        <SubmitButton pendingText="Uploading..." className="primary-button mt-3 rounded-md">Upload</SubmitButton>
      </form>

      <article className="card p-0">
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold">My documents</h2>
        </div>
        <div className="mt-2 divide-y divide-border/70">
          {documents.map((doc) => (
            <Link key={doc.id} href={`${detailBase}/${doc.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/55">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{doc.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {doc.kind}{doc.isSensitive && doc.documentNumber ? ` · ${maskNumber(doc.documentNumber)}` : doc.documentNumber ? ` · ${doc.documentNumber}` : ""}
                  {doc.expiryDate ? ` · expires ${new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(doc.expiryDate))}` : ""}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">Open →</span>
            </Link>
          ))}
          {documents.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No documents yet.</p>
          )}
        </div>
      </article>
    </section>
  );
}
