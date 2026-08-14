import { type NextRequest, NextResponse } from "next/server";

/**
 * Route protection middleware.
 *
 * Reads the "expenn.token" cookie set by the .NET API auth flow.
 * Does NOT verify the JWT signature (that happens on the .NET API).
 * Simply checks the token exists and is not expired by reading the `exp` claim.
 *
 * Protected paths: everything under /(dashboard).
 * Public paths: auth pages, marketing pages, OIDC callback.
 */

const TOKEN_COOKIE = "expenn.token";

/** Paths that don't require a signed-in user. */
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/",       // OIDC callback lives here
  "/api/",        // API routes (proxied or internal)
  "/_next/",      // Next.js assets
  "/favicon",
  "/docs/",
  "/terms",
  "/privacy",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === "/";
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
    const { exp } = JSON.parse(decoded) as { exp?: number };
    if (!exp) return false;
    return Date.now() / 1000 > exp;
  } catch {
    return true; // treat malformed token as expired
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const signedIn = token && !isTokenExpired(token);

  if (!signedIn) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match everything except static files and image optimisation routes.
   * The public-path check above handles the actual allow-list.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
