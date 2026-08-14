import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { apiClient } from "@/lib/api-client";

export default async function DocumentDetailPage({ params }: { params: Promise<{ workspace: string; documentId: string }> }) {
  const { workspace, documentId } = await params;
  const api = apiClient({ cookie: (await cookies()).toString() });
  const [document, currentUser] = await Promise.all([
    api.documents.getById(documentId).catch(() => null),
    api.auth.me(),
  ]);
  if (!document) return notFound();

  return (
    <AppShell role="traveler" breadcrumbs={[
      { label: "Documents", href: `/${workspace}/traveler/documents` },
      { label: document.title },
    ]}>
      <section className="w-full space-y-5">
        <h1 className="text-2xl font-bold">{document.title}</h1>
        <article className="card">
          <h2 className="text-lg font-semibold">Details</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <MetaItem label="Type" value={document.kind} />
            <MetaItem label="Owner" value={currentUser.name} />
            {document.issuer && <MetaItem label="Issuer" value={document.issuer} />}
            {document.holderName && <MetaItem label="Holder" value={document.holderName} />}
            <MetaItem label="Document #" value={document.isSensitive ? "Protected" : (document.documentNumber ?? "—")} />
            {document.issueDate && <MetaItem label="Issued" value={new Date(document.issueDate).toLocaleDateString()} />}
            {document.expiryDate && <MetaItem label="Expires" value={new Date(document.expiryDate).toLocaleDateString()} />}
            <MetaItem label="Sensitive" value={document.isSensitive ? "Yes" : "No"} />
          </ul>
        </article>
        {document.fileUrl && (
          <article className="card">
            <h2 className="text-lg font-semibold">File</h2>
            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="secondary-button mt-3 rounded-md text-sm">
              Open file
            </a>
          </article>
        )}
      </section>
    </AppShell>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="capitalize">{value}</span>
    </li>
  );
}
