import Link from "next/link";
import { Building2, Mail, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { PageHeader } from "@/components/layout/page";
import { apiClient } from "@/lib/api-client";

export default async function TravelerAccountPage() {
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const initials = currentUser.name.split(/[\s.@_-]+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <AppShell role="traveler" personal breadcrumbs={[{ label: "Account" }]}>
      <PageHeader title="Account" description="Your profile and workspace." />
      <div className="grid max-w-3xl gap-5">
        <section className="card flex flex-wrap items-center gap-4">
          <span className="avatar size-14 text-lg">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{currentUser.name}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground"><Mail className="size-4" />{currentUser.email}</p>
          </div>
          <span className="chip"><ShieldCheck className="size-3.5" /> Passwordless sign-in</span>
        </section>
        <section className="card flex flex-wrap items-center gap-4">
          <span className="icon-tile icon-tile-primary"><Building2 className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Travelling with a team?</p>
            <p className="text-sm text-muted-foreground">Create a company workspace to invite colleagues, approve trips and pay back expenses together.</p>
          </div>
          <Link href="/onboarding" className="secondary-button">Create team workspace</Link>
        </section>
      </div>
    </AppShell>
  );
}
