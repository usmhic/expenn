import { AppShell } from "@/components/layout/navigation";
import { DocumentVault } from "@/components/documents/document-vault";

export default async function TravelerDocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Documents" }]}>
      <DocumentVault error={error} />
    </AppShell>
  );
}
