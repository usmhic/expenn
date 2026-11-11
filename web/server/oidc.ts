import { API_BASE_URL } from "@/lib/api-client";

export interface OidcInfo {
  enabled: boolean;
  providerName: string;
}

/** SSO availability for the sign-in page, read from the API on the server. */
export async function getServerOidcInfo(): Promise<OidcInfo> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/oidc/info`, { cache: "no-store" });
    if (!res.ok) return { enabled: false, providerName: "SSO" };
    const data = (await res.json()) as Partial<OidcInfo>;
    return { enabled: Boolean(data.enabled), providerName: data.providerName || "SSO" };
  } catch {
    return { enabled: false, providerName: "SSO" };
  }
}
