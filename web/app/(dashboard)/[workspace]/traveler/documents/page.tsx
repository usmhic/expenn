import { AppShell } from "@/components/layout/navigation";
import { DocumentVault } from "@/components/documents/document-vault";

export default async function TravelerDocumentsPage() {
  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Documents" }]}>
      <DocumentVault />
    </AppShell>
  );
}
