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
export function LoginClient({ callbackURL, oidcEnabled, oidcProviderName, initialError }: Props) {
  const [tab, setTab] = useState<Tab>("otp");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "otp", label: "Email code", icon: <Mail className="size-3.5" /> },
    { id: "password", label: "Password", icon: <KeyRound className="size-3.5" /> },
    // Show AD tab for on-premises LDAP; when OIDC is enabled, SSO button handles it
    ...(!oidcEnabled
      ? [{ id: "ad" as Tab, label: "Active Directory", icon: <Building2 className="size-3.5" /> }]
      : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Sign in to manage travel, expenses, and approvals.
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
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Initial error from query string (e.g. OIDC error redirect) */}
      {initialError && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          {initialError}
        </div>
      )}

      {tab === "otp" && <EmailMagicLinkForm callbackURL={callbackURL} />}
      {tab === "password" && <PasswordSignInForm callbackURL={callbackURL} />}
      {tab === "ad" && <ADSignInForm callbackURL={callbackURL} />}
    </div>
  );
}
