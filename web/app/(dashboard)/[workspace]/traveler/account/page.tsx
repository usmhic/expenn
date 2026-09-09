import { UserRound } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/navigation";
import { apiClient } from "@/lib/api-client";

export default async function TravelerAccountPage() {
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();

  const initials = currentUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <AppShell role="traveler" breadcrumbs={[{ label: "Account" }]}>
      <section className="w-full max-w-xl space-y-5">
        <div>
          <h1 className="text-xl font-bold">Account</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Your profile.</p>
        </div>

        {/* ── Profile ── */}
        <article className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserRound className="size-3.5" />
            </span>
            <h2 className="text-base font-semibold">Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-elegant">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{currentUser.name}</p>
              <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground rounded-full border border-border inline-block px-2 py-0.5">
                {currentUser.organizationRole}
              </p>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
