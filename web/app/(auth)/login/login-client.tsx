"use client";

import { useState } from "react";
import { Building2, KeyRound, Mail } from "lucide-react";
import { ADSignInForm, EmailMagicLinkForm, PasswordSignInForm } from "@/components/auth/email-auth-forms";
import { SocialSignInButtons } from "@/components/auth/social-sign-in";

type Tab = "otp" | "password" | "ad";

interface Props {
  callbackURL: string;
  oidcEnabled: boolean;
  oidcProviderName: string;
  initialError?: string;
  invited?: boolean;
}

/**
 * Client component — renders login tabs (OTP, Password, Active Directory)
 * and the OIDC/SSO button.
 *
 * Auth method availability:
 *  - OTP tab:      always shown (email is the baseline)
 *  - Password tab: always shown (fallback for password-based accounts)
 *  - AD tab:       shown when oidcEnabled=false (on-premises LDAP)
 *                  When oidcEnabled=true, AD is accessed via the OIDC flow
 *  - OIDC button:  shown when oidcEnabled=true
 */
export function LoginClient({ callbackURL, oidcEnabled, oidcProviderName, initialError, invited }: Props) {
  const [tab, setTab] = useState<Tab>("otp");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "otp", label: "Email code", icon: <Mail className="size-3.5" /> },
    { id: "password", label: "Password", icon: <KeyRound className="size-3.5" /> },
    // Show AD tab for on-premises LDAP; when OIDC is enabled, SSO button handles it
    ...(!oidcEnabled
      ? [{ id: "ad" as Tab, label: "Directory", icon: <Building2 className="size-3.5" /> }]
      : []),
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{invited ? "Join your team" : "Sign in to Expenn"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {invited ? "Sign in with the email your invitation was sent to." : "Use a one-time code sent to your email — no password needed."}
        </p>
      </div>

      {/* OIDC / SSO button — shown above tabs when configured */}
      {oidcEnabled && (
        <div className="mb-4">
          <SocialSignInButtons
            callbackURL={callbackURL}
            oidcEnabled={oidcEnabled}
            oidcProviderName={oidcProviderName}
          />
        </div>
      )}

      {/* Method tabs */}
      <div className="segmented mb-5 flex w-full" role="tablist" aria-label="Sign-in method">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className="segmented-item flex-1 justify-center"
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Initial error from query string (e.g. OIDC error redirect) */}
      {initialError && (
        <div className="notice notice-danger mb-4">
          {initialError}
        </div>
      )}

      {tab === "otp" && <EmailMagicLinkForm callbackURL={callbackURL} />}
      {tab === "password" && <PasswordSignInForm callbackURL={callbackURL} />}
      {tab === "ad" && <ADSignInForm callbackURL={callbackURL} />}
    </div>
  );
}
