import { Mail, Shield, Users } from "lucide-react";
import { cookies } from "next/headers";
import { AppShell, StatusBadge } from "@/components/layout/navigation";
import { AddToTeamDialog, CreateTeamDialog, InviteMemberDialog } from "@/components/dialogs";
import { apiClient } from "@/lib/api-client";

export default async function AdminSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ workspace }, { error }] = await Promise.all([params, searchParams]);
  const api = apiClient({ cookie: (await cookies()).toString() });
  const currentUser = await api.auth.me();
  const role = currentUser.organizationRole === "manager" ? "manager" : "admin";
  const isManager = role === "manager";
  const orgId = currentUser.activeOrganizationId || workspace;

  const [teams, members, invitations] = await Promise.all([
    api.organizations.getTeams(orgId),
    api.organizations.getMembers(orgId),
    isManager
      ? Promise.resolve([] as Awaited<ReturnType<typeof api.organizations.getInvitations>>)
      : api.organizations.getInvitations(orgId),
  ]);

  const isOwner = currentUser.organizationRole === "owner";
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <AppShell role={role} breadcrumbs={[{ label: "Settings" }]}>
      <section className="w-full space-y-5">
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
            {decodeURIComponent(error)}
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Members and teams for this workspace.
          </p>
        </div>

        {/* ── Members ── */}
        <article className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="size-3.5" />
              </span>
              <h2 className="text-base font-semibold">Members</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {members.length} member{members.length === 1 ? "" : "s"}
              </span>
              {isOwner && <InviteMemberDialog />}
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-[0.75rem] font-bold text-primary-foreground shadow-elegant">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                </span>
                <span className="capitalize text-xs text-muted-foreground rounded-full border border-border px-2 py-0.5">{m.role}</span>
              </div>
            ))}
          </div>

          {pendingInvitations.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Pending invitations</p>
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-1.5">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground truncate">{inv.email}</span>
                  <StatusBadge value={inv.status} />
                  <span className="text-xs capitalize text-muted-foreground">{inv.role}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* ── Teams ── */}
        <article className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Shield className="size-3.5" />
              </span>
              <h2 className="text-base font-semibold">Teams</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{teams.length} team{teams.length === 1 ? "" : "s"}</span>
              {isOwner && (
                <>
                  <AddToTeamDialog members={members} teams={teams} />
                  <CreateTeamDialog />
                </>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-secondary/35 p-3">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Team created {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-3">No teams yet. Create one to organize your travelers.</p>
            )}
          </div>
        </article>

      </section>
    </AppShell>
  );
}
