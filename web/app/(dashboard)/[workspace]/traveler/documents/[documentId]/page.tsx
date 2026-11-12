import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, FileText, Lock } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { PageHeader } from "@/components/layout/page";
import { DOCUMENT_KINDS } from "@/components/documents/add-document-dialog";
import { apiClient } from "@/lib/api-client";

function day(date?: string) {
  return date ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date)) : undefined;
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ workspace: string; documentId: string }> }) {
  const { workspace, documentId } = await params;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [document, currentUser, trips] = await Promise.all([
    api.documents.getById(documentId).catch(() => null),
    api.auth.me(),
    api.trips.list({ mine: true }).catch(() => []),
  ]);
  if (!document) return notFound();
  const kind = DOCUMENT_KINDS.find((k) => k.value === document.kind)?.label ?? document.kind;
  const trip = trips.find((t) => t.id === document.tripId);
  const isImage = document.mimeType?.startsWith("image/");

  const rows: [string, string | undefined][] = [
    ["Type", kind],
    ["Holder", document.holderName ?? currentUser.name],
    ["Issuer", document.issuer],
    ["Number", document.isSensitive ? (document.documentNumber ? `•••• ${document.documentNumber.slice(-4)}` : undefined) : document.documentNumber],
    ["Issued", day(document.issueDate)],
    ["Expires", day(document.expiryDate)],
    ["Trip", trip?.name],
    ["File", document.fileName],
  ];

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Documents", href: `/${workspace}/traveler/documents` }, { label: document.title }]}>
      <PageHeader
        eyebrow={kind}
        title={document.title}
        description={document.isSensitive ? <span className="flex items-center gap-1.5"><Lock className="size-4" /> Marked sensitive — the number is masked in lists.</span> : undefined}
        actions={document.fileUrl ? (
          <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="primary-button"><ExternalLink className="size-4" /> Open file</a>
        ) : undefined}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card card-flush">
          {document.fileUrl && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.fileUrl} alt={document.title} className="max-h-[70vh] w-full bg-muted object-contain" />
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"><FileText className="size-5" /></span>
              <p className="empty-state-title">{document.fileUrl ? "Preview not available" : "No file attached"}</p>
              <p className="empty-state-text">{document.fileUrl ? "Open the file to view it." : "This record keeps the details only."}</p>
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="card-title mb-3">Details</h2>
          <dl className="divide-list text-sm">
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {document.expiryDate && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <CalendarClock className="size-4" /> Check entry rules: many countries need six months of validity left.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
