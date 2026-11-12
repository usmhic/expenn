import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/layout/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AuthAside } from "@/components/auth/auth-aside";
import { getServerOidcInfo } from "@/server/oidc";
import { LoginClient } from "./login-client";

export const metadata = { title: "Sign in" };

/**
 * Server component — checks for an existing session, reads SSO availability from
 * the API, then renders the client sign-in UI.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string; error?: string }>;
}) {
  const { next, invite, error: queryError } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  const cookieHeader = (await headers()).get("cookie") ?? "";
  if (cookieHeader.includes("expenn.token=")) {
    if (invite) redirect(`/onboarding?invite=${encodeURIComponent(invite)}`);
    redirect(safeNext ?? "/onboarding");
  }

  const oidcInfo = await getServerOidcInfo();
  const callbackURL = invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : safeNext ?? "/onboarding";

  return (
    <main className="auth-layout">
      <section className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-10">
          <LoginClient
            callbackURL={callbackURL}
            oidcEnabled={oidcInfo.enabled}
            oidcProviderName={oidcInfo.providerName}
            initialError={queryError}
            invited={Boolean(invite)}
          />
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
        <p className="text-center text-xs text-subtle">New here? Enter your email — we&apos;ll create your account with the first code.</p>
      </section>
      <AuthAside />
    </main>
  );
}
