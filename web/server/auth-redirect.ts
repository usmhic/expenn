import { apiClient } from "@/lib/api-client";
import { roleHome } from "@/server/workspace";

export interface SignedInState {
  userId: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
  workspaceSlug: string;
  workspaceName: string;
  redirectTo: string;
}

/**
 * Auth source of truth is the .NET API's JWT, carried in the "expenn.token"
 * cookie. `headers.get("cookie")` is forwarded as-is to the API, which reads
 * the cookie itself (see Program.cs JwtBearerEvents) — no local session store.
 */
export async function getSignedInRedirect(headers: Headers): Promise<string | null> {
  const me = await fetchMe(headers);
  if (!me) return null;

  // User is authenticated — always give them somewhere to go.
  if (!me.activeOrganizationId || !me.organizationRole || !me.activeOrganizationSlug) {
    return "/onboarding";
  }
  return roleHome(me.organizationRole, me.activeOrganizationSlug);
}

export async function getSignedInState(headers: Headers): Promise<SignedInState | null> {
  const me = await fetchMe(headers);
  if (!me) return null;
  if (!me.activeOrganizationId || !me.organizationRole || !me.activeOrganizationSlug) return null;

  return {
    userId: me.id,
    name: me.name,
    email: me.email,
    organizationId: me.activeOrganizationId,
    role: me.organizationRole,
    workspaceSlug: me.activeOrganizationSlug,
    workspaceName: me.activeOrganizationName ?? me.activeOrganizationSlug,
    redirectTo: roleHome(me.organizationRole, me.activeOrganizationSlug),
  };
}

async function fetchMe(headers: Headers) {
  try {
    return await apiClient({ cookie: headers.get("cookie") ?? "" }).auth.me();
  } catch {
    return null;
  }
}
