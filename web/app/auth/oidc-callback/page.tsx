"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";

/**
 * OIDC callback page.
 * The .NET API redirects here after a successful OIDC login with:
 *   /auth/oidc-callback?token=<JWT>&expires_at=<unix>
 * or on error:
 *   /auth/oidc-callback?error=<message>
 */
export default function OidcCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <OidcCallback />
    </Suspense>
  );
}

function OidcCallback() {
  const router = useRouter();
  const params = useSearchParams();

  const token = params.get("token");
  const expiresAt = params.get("expires_at");
  const err = params.get("error");
  const error = err
    ? decodeURIComponent(err)
    : !token || !expiresAt
      ? "Invalid callback — missing token."
      : null;

  useEffect(() => {
    if (error || !token || !expiresAt) return;
    authClient.finishOidc(token, Number(expiresAt));
    router.replace("/onboarding");
  }, [error, token, expiresAt, router]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-sm font-semibold text-rose-600">Sign-in failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/login" className="text-sm underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return <CallbackFallback />;
}

function CallbackFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Spinner className="size-6" />
        <p className="text-sm">Completing sign-in…</p>
      </div>
    </main>
  );
}
