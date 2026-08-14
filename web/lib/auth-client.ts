"use client";

/**
 * Client-side auth helper that talks to the Expenn .NET Web API.
 * Replaces the Better Auth React client.
 *
 * Token storage strategy:
 *  - JWT stored in a JS-accessible cookie ("expenn.token").
 *  - Next.js middleware reads this cookie to protect routes server-side.
 *  - The .NET API reads the same cookie as a fallback when the
 *    Authorization header is absent (configured in Program.cs JwtBearerEvents).
 */

const API_URL =
  process.env.NEXT_PUBLIC_DOTNET_API_URL ?? "http://localhost:5000";

const TOKEN_COOKIE = "expenn.token";

// ── Token cookie helpers ──────────────────────────────────────────────────────

export function setTokenCookie(token: string, expiresAt: string) {
  const expires = new Date(expiresAt).toUTCString();
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearTokenCookie() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: string; // ISO string
  user: AuthUser;
}

// ── Core POST helper ──────────────────────────────────────────────────────────

async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<{ data?: T; error?: string }> {
  try {
    const token = getTokenFromCookie();
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      return {
        error: data?.error ?? data?.title ?? `Request failed (${res.status})`,
      };
    return { data: data as T };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Network error" };
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authClient = {
  /** Send a 6-digit OTP to the given email. */
  sendOtp: (email: string) =>
    apiPost<{ message: string }>("/api/auth/send-otp", { email }),

  /** Verify OTP — sets JWT cookie on success. */
  verifyOtp: async (email: string, code: string) => {
    const { data, error } = await apiPost<AuthSession>(
      "/api/auth/verify-otp",
      { email, code },
    );
    if (data) setTokenCookie(data.accessToken, data.expiresAt);
    return { data, error };
  },

  /** Email + password sign-in. */
  signInWithPassword: async (email: string, password: string) => {
    const { data, error } = await apiPost<AuthSession>("/api/auth/login", {
      email,
      password,
    });
    if (data) setTokenCookie(data.accessToken, data.expiresAt);
    return { data, error };
  },

  /** Register a new account with email + password. */
  register: async (email: string, password: string) => {
    const { data, error } = await apiPost<AuthSession>("/api/auth/register", {
      email,
      password,
    });
    if (data) setTokenCookie(data.accessToken, data.expiresAt);
    return { data, error };
  },

  /** On-premises Active Directory (LDAP) sign-in. */
  signInWithAD: async (username: string, password: string) => {
    const { data, error } = await apiPost<AuthSession>("/api/auth/ad/login", {
      username,
      password,
    });
    if (data) setTokenCookie(data.accessToken, data.expiresAt);
    return { data, error };
  },

  /**
   * Redirect the browser to the OIDC / SSO provider via the .NET API.
   * Called when the user clicks "Sign in with SSO".
   */
  startOidc: () => {
    window.location.href = `${API_URL}/api/auth/oidc/login?client=web`;
  },

  /**
   * Finalise OIDC login from /auth/oidc-callback — call with the token
   * the .NET API appended to the redirect URL.
   */
  finishOidc: (token: string, expiresAtUnix: number) => {
    const expiresAtIso = new Date(expiresAtUnix * 1000).toISOString();
    setTokenCookie(token, expiresAtIso);
  },

  /** Switch active workspace — re-issues JWT with new org context. */
  switchOrg: async (organizationId: string) => {
    const { data, error } = await apiPost<AuthSession>(
      "/api/auth/switch-org",
      { organizationId },
    );
    if (data) setTokenCookie(data.accessToken, data.expiresAt);
    return { data, error };
  },

  /** Sign out — clears local cookie. */
  signOut: async () => {
    await apiPost("/api/auth/logout", {}).catch(() => {});
    clearTokenCookie();
  },

  isSignedIn: () => Boolean(getTokenFromCookie()),
};

// ── OIDC provider info ────────────────────────────────────────────────────────

export interface OidcInfo {
  enabled: boolean;
  providerName: string;
  loginUrl: string | null;
}

export async function getOidcInfo(): Promise<OidcInfo> {
  try {
    const res = await fetch(`${API_URL}/api/auth/oidc/info`);
    return res.ok
      ? (res.json() as Promise<OidcInfo>)
      : { enabled: false, providerName: "SSO", loginUrl: null };
  } catch {
    return { enabled: false, providerName: "SSO", loginUrl: null };
  }
}

// ── Legacy shim — keeps existing imports from breaking ────────────────────────
// Remove once all callers are migrated to authClient.*.
export const signIn = {
  magicLink: ({ email, callbackURL }: { email: string; callbackURL?: string }) =>
    authClient.sendOtp(email).then((r) => ({ error: r.error ? { message: r.error } : null })),
};
export const signUp = { email: () => Promise.resolve({ error: null }) };
export const signOut = authClient.signOut;
export const useSession = () => ({ data: null, isPending: false });
export const getSession = () => Promise.resolve(null);
