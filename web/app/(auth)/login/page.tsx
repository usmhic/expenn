import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/layout/wordmark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getOidcInfo } from "@/lib/auth-client";
import { LoginClient } from "./login-client";

/**
 * Server component — fetches OIDC info from the .NET API, checks if the user
 * is already signed in, then renders the client login UI.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; invite?: string; error?: string }>;
}) {
  const { next, invite, error: queryError } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  // Check if already signed in via cookie
  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const hasToken = cookieHeader.includes("expenn.token=");
  if (hasToken) {
    if (invite) redirect(`/onboarding?invite=${encodeURIComponent(invite)}`);
    redirect(safeNext ?? "/onboarding");
  }

  // Fetch OIDC provider info from the .NET API (server-side, no waterfall)
  const oidcInfo = await getOidcInfo();

  const callbackURL = invite
    ? `/onboarding?invite=${encodeURIComponent(invite)}`
    : safeNext ?? "/onboarding";

  return (
    <main className="auth-screen min-h-dvh bg-background px-4 py-8">
      <section className="auth-card w-full max-w-[26rem]">
        <div className="mb-6 flex items-center justify-between">
          <Wordmark iconClassName="brand-icon-mark size-9" textClassName="text-xl" />
          <ThemeToggle />
        </div>

        <LoginClient
          callbackURL={callbackURL}
          oidcEnabled={oidcInfo.enabled}
          oidcProviderName={oidcInfo.providerName}
          initialError={queryError}
        />

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
