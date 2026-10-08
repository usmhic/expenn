import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiClient, ApiError } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams the API's CSV export to the browser with the session cookie attached. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(
    ["status", "tripId", "mine", "from", "to"]
      .map((key) => [key, request.nextUrl.searchParams.get(key) ?? undefined])
      .filter(([, value]) => value)
  );

  try {
    const api = apiClient({ cookie: (await cookies()).toString() });
    const res = await api.expenses.exportCsv(params);
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
        "Content-Disposition": res.headers.get("Content-Disposition") ?? 'attachment; filename="expenn-expenses.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: "Export failed" }, { status });
  }
}
