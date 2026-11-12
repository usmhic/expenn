import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle, CreditCard, FileText, FolderOpen, Lock, Plane, Receipt } from "lucide-react";
import { apiClient, type DocumentDto } from "@/lib/api-client";
import { getSignedInState } from "@/server/auth-redirect";
import { EmptyState, PageHeader } from "@/components/layout/page";
import { AddDocumentDialog, DOCUMENT_KINDS } from "@/components/documents/add-document-dialog";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "identity", label: "Identity & entry", kinds: ["passport", "visa", "id_card", "drivers_license"], icon: CreditCard },
  { key: "travel", label: "Travel plans", kinds: ["itinerary"], icon: Plane },
  { key: "money", label: "Receipts & paperwork", kinds: ["receipt", "invoice", "contract", "other"], icon: Receipt },
] as const;

function maskNumber(value?: string) {
  if (!value || value.length <= 4) return value ?? "";
  return `•••• ${value.slice(-4)}`;
}

function expiry(doc: DocumentDto) {
  if (!doc.expiryDate) return null;
  const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86_400_000);
  const label = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(doc.expiryDate));
  if (days < 0) return { tone: "danger" as const, text: `Expired ${label}` };
  if (days <= 180) return { tone: "warning" as const, text: `Expires ${label}` };
  return { tone: "ok" as const, text: `Valid until ${label}` };
}

export async function DocumentVault({ error }: { error?: string }) {
  const state = await getSignedInState(await headers());
  if (!state) redirect("/login?error=session-required");

  const api = apiClient({ cookie: (await cookies()).toString() });
  const [documents, trips] = await Promise.all([
    api.documents.list().catch(() => null),
    api.trips.list({ mine: true }).catch(() => []),
  ]);
  const detailBase = `/${state.workspaceSlug}/traveler/documents`;
  const expiring = (documents ?? []).filter((d) => {
    const e = expiry(d);
    return e && e.tone !== "ok";
  });

  return (
    <>
      <PageHeader
        title="Documents"
        description="Passports, visas, tickets and paperwork — ready when you need them at the border or the front desk."
        actions={<AddDocumentDialog trips={trips.map((t) => ({ id: t.id, name: t.name }))} />}
      />

      {error && <div className="notice notice-danger mb-5">{decodeURIComponent(error)}</div>}
      {documents === null && (
        <div className="notice notice-danger mb-5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          Documents couldn&apos;t be loaded right now. Try again in a moment.
        </div>
      )}
      {expiring.length > 0 && (
        <div className="notice notice-warning mb-5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <strong>{expiring.length} document{expiring.length === 1 ? "" : "s"}</strong> expired or expiring within six months:{" "}
            {expiring.map((d) => d.title).join(", ")}. Many countries require six months&apos; passport validity.
          </span>
        </div>
      )}

      {documents && documents.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderOpen}
            title="Your vault is empty"
            description="Add your passport, visas and booking confirmations so they're with you on every trip."
            action={<AddDocumentDialog trips={trips.map((t) => ({ id: t.id, name: t.name }))} />}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const docs = (documents ?? []).filter((d) => (group.kinds as readonly string[]).includes(d.kind));
            if (docs.length === 0) return null;
            return (
              <section key={group.key}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <group.icon className="size-4" /> {group.label}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {docs.map((doc) => {
                    const exp = expiry(doc);
                    const trip = trips.find((t) => t.id === doc.tripId);
                    return (
                      <Link key={doc.id} href={`${detailBase}/${doc.id}`} className="card card-interactive flex items-start gap-3 p-4">
                        <span className="icon-tile icon-tile-primary"><FileText className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{doc.title}</span>
                            {doc.isSensitive && <Lock className="size-3.5 shrink-0 text-subtle" aria-label="Sensitive" />}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {DOCUMENT_KINDS.find((k) => k.value === doc.kind)?.label ?? doc.kind}
                            {doc.documentNumber ? ` · ${doc.isSensitive ? maskNumber(doc.documentNumber) : doc.documentNumber}` : ""}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {exp && (
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                                exp.tone === "danger" && "bg-destructive/10 text-destructive",
                                exp.tone === "warning" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                                exp.tone === "ok" && "bg-muted text-muted-foreground"
                              )}>{exp.text}</span>
                            )}
                            {trip && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">{trip.name}</span>}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
