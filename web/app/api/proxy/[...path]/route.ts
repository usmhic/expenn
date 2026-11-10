import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin bridge for interactive browser features (the trip planner) to reach the
 * .NET API with the session cookie. Only the routes listed here are forwarded.
 */
const ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^places\/search$/ },
  { method: "GET", pattern: /^places\/reverse$/ },
  { method: "GET", pattern: /^routing\/status$/ },
  { method: "POST", pattern: /^routing\/directions$/ },
  { method: "POST", pattern: /^routing\/optimize$/ },
  { method: "GET", pattern: /^trips\/[A-Za-z0-9-]{1,64}\/itinerary$/ },
  { method: "PUT", pattern: /^trips\/[A-Za-z0-9-]{1,64}\/itinerary$/ },
];

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!ALLOWED.some((rule) => rule.method === request.method && rule.pattern.test(path))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers: Record<string, string> = { Cookie: (await cookies()).toString() };
  const body = request.method === "GET" ? undefined : await request.text();
  if (body) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${API_BASE_URL}/api/${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text || null, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "The server could not be reached. Try again in a moment." }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as PUT };
