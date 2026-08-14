import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const api = apiClient({ cookie: (await cookies()).toString() });
    const me = await api.auth.me();
    return NextResponse.json(me);
  } catch {
    return NextResponse.json(null, { status: 401 });
  }
}
