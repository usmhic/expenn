import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const api = apiClient({ cookie: (await cookies()).toString() });
    const orgs = await api.organizations.list();
    return NextResponse.json(orgs);
  } catch {
    return NextResponse.json([]);
  }
}
