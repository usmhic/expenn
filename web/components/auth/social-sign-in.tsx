"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

/**
 * Social + SSO sign-in buttons.
 *
 * - Google / Apple: reserved for when OAuth is wired up externally.
 * - SSO (OIDC): redirects through the .NET API's /api/auth/oidc/login flow.
 * - Active Directory: shown when AD mode is "azure" or "ldap" (redirects
 *   to the AD tab on the login page or triggers the OIDC flow if Azure).
 *
 * Pass `oidcEnabled` and `oidcProviderName` from the server component that
 * fetches /api/auth/oidc/info — this avoids a client-side fetch waterfall.
 */

interface Props {
  callbackURL?: string;
  oidcEnabled?: boolean;
  oidcProviderName?: string;
  onShowADTab?: () => void;
}

export function SocialSignInButtons({
  callbackURL = "/onboarding",
  oidcEnabled = false,
  oidcProviderName = "SSO",
  onShowADTab,
}: Props) {
  const [oidcPending, setOidcPending] = useState(false);

  function handleOidc() {
    setOidcPending(true);
    authClient.startOidc(); // redirects browser to .NET API → OIDC provider
  }

  const hasSocialOrSso = oidcEnabled || Boolean(onShowADTab);
  if (!hasSocialOrSso) return null;

  return (
    <div className="space-y-2.5">
      {/* Generic OIDC / SSO — e.g. Entra ID, Okta, Auth0, Keycloak */}
      {oidcEnabled && (
        <button
          type="button"
          className="secondary-button w-full justify-center gap-3 py-2.5"
          onClick={handleOidc}
          disabled={oidcPending}
        >
          {oidcPending ? (
            <Spinner className="size-4" />
          ) : (
            <Building2 className="size-4" />
          )}
          <span className="text-sm font-semibold">
            Continue with {oidcProviderName}
          </span>
        </button>
      )}

      {/* On-premises AD tab switch — shows the username/password form */}
      {onShowADTab && (
        <button
          type="button"
          className="secondary-button w-full justify-center gap-3 py-2.5"
          onClick={onShowADTab}
        >
          <Building2 className="size-4" />
          <span className="text-sm font-semibold">
            Sign in with Active Directory
          </span>
        </button>
      )}

      <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
