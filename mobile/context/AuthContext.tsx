import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { clearStoredSession, getStoredSession, setStoredSession } from "../lib/session";

// .NET API base — set EXPO_PUBLIC_API_URL to your .NET server address (LAN IP for devices)
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://api.expenn.osas.cloud").replace(/\/+$/, "");
const AUTH_BASE = `${API_URL}/api/auth`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  emailVerified?: boolean;
  role?: string;
  workspace?: { name: string };
}

interface StoredSession {
  access_token: string;
  expires_at: number; // unix timestamp (seconds)
}

interface AuthContextValue {
  user: AuthUser | null;
  session: StoredSession | null;
  loading: boolean;
  /** Step 1: send OTP to email */
  sendOtp: (email: string) => Promise<{ error?: string }>;
  /** Step 2: verify OTP, signs in on success */
  verifyOtp: (email: string, code: string) => Promise<{ error?: string }>;
  /** Email + password sign-in */
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  /** On-premises Active Directory (LDAP) */
  signInWithAD: (username: string, password: string) => Promise<{ error?: string }>;
  /** Start OIDC browser flow (Entra ID, Okta, Auth0, …) */
  startOidc: () => Promise<{ error?: string }>;
  /** Complete an OAuth deep-link callback. */
  socialCallback: (token: string, expiresAt: number, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  sendOtp: async () => ({}),
  verifyOtp: async () => ({}),
  signInWithPassword: async () => ({}),
  signInWithAD: async () => ({}),
  startOidc: async () => ({}),
  socialCallback: async () => {},
  signOut: async () => {},
});

// ── Storage helpers ───────────────────────────────────────────────────────────

const USER_KEY = "expenn_user";

function isWeb() {
  return Platform.OS === "web" && typeof localStorage !== "undefined";
}

async function setJson(key: string, value: unknown) {
  const s = JSON.stringify(value);
  try {
    isWeb() ? localStorage.setItem(key, s) : await SecureStore.setItemAsync(key, s);
  } catch {}
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = isWeb()
      ? localStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {}
  return null;
}

async function removeJson(key: string) {
  try {
    isWeb() ? localStorage.removeItem(key) : await SecureStore.deleteItemAsync(key);
  } catch {}
}

// ── Core API helper ───────────────────────────────────────────────────────────

interface DotnetAuthResponse {
  accessToken: string;
  expiresAt: string; // ISO string
  user: AuthUser;
}

async function authPost(
  endpoint: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<DotnetAuthResponse> {
  const res = await fetch(`${AUTH_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? data.title ?? "Request failed");
  return data as DotnetAuthResponse;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([getStoredSession(), getJson<AuthUser>(USER_KEY)]).then(
      ([storedSession, storedUser]) => {
        if (!mounted) return;
        const nowSec = Date.now() / 1000;
        const valid =
          storedSession &&
          storedUser &&
          (!storedSession.expires_at || storedSession.expires_at > nowSec);
        if (valid) {
          setSession(storedSession);
          setUser(storedUser);
        } else {
          clearStoredSession().catch(() => {});
          removeJson(USER_KEY).catch(() => {});
        }
      },
    ).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const finish = useCallback(async (data: DotnetAuthResponse) => {
    const sess: StoredSession = {
      access_token: data.accessToken,
      expires_at: Math.floor(new Date(data.expiresAt).getTime() / 1000),
    };
    setUser(data.user);
    setSession(sess);
    await Promise.all([setStoredSession(sess), setJson(USER_KEY, data.user)]);
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────────

  const sendOtp = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${AUTH_BASE}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { error: d.error ?? "Could not send code. Please try again." };
      }
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Network error" };
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    try {
      const data = await authPost("verify-otp", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      await finish(data);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid or expired code." };
    }
  }, [finish]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const data = await authPost("login", {
        email: email.trim().toLowerCase(),
        password,
      });
      await finish(data);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid credentials." };
    }
  }, [finish]);

  const signInWithAD = useCallback(async (username: string, password: string) => {
    try {
      const data = await authPost("ad/login", { username: username.trim(), password });
      await finish(data);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Active Directory authentication failed." };
    }
  }, [finish]);

  const startOidc = useCallback(async () => {
    try {
      const oidcLoginUrl = `${AUTH_BASE}/oidc/login?client=mobile`;
      // Open in an in-app browser; the .NET API will redirect to expenn://auth/oidc-callback
      const result = await WebBrowser.openAuthSessionAsync(oidcLoginUrl, "expenn://auth/oidc-callback");

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get("token");
        const expiresAt = url.searchParams.get("expires_at");
        const error = url.searchParams.get("error");

        if (error) return { error: decodeURIComponent(error) };
        if (!token || !expiresAt) return { error: "Invalid OIDC callback — missing token." };

        const sess: StoredSession = {
          access_token: token,
          expires_at: Number(expiresAt),
        };
        // Fetch user info with the new token
        const meRes = await fetch(`${AUTH_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = meRes.ok ? await meRes.json() : null;

        if (me) {
          setUser(me as AuthUser);
          setSession(sess);
          await Promise.all([setStoredSession(sess), setJson(USER_KEY, me)]);
        }
        return {};
      }

      return result.type === "cancel" ? { error: "Sign-in was cancelled." } : {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "OIDC sign-in failed." };
    }
  }, []);

  const socialCallback = useCallback(async (token: string, expiresAt: number, callbackUser: AuthUser) => {
    const sess: StoredSession = { access_token: token, expires_at: expiresAt };
    setUser(callbackUser);
    setSession(sess);
    await Promise.all([setStoredSession(sess), setJson(USER_KEY, callbackUser)]);
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (session?.access_token) {
        await fetch(`${AUTH_BASE}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {}
    setUser(null);
    setSession(null);
    await Promise.all([clearStoredSession(), removeJson(USER_KEY)]).catch(() => {});
  }, [session]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, sendOtp, verifyOtp, signInWithPassword, signInWithAD, startOidc, socialCallback, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
