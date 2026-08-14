import { type NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  try {
    const api = apiClient({ cookie: (await cookies()).toString() });

    const [trips, expenses] = await Promise.all([
      api.trips.list({}).catch(() => []),
      api.expenses.list({ mine: true }).catch(() => []),
    ]);

    const tripResults = trips
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.destination ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((t) => ({ type: "trip" as const, id: t.id, label: t.name, sub: t.destination ?? "" }));

    const expenseResults = expenses
      .filter(
        (e) =>
          (e.merchant ?? "").toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((e) => ({ type: "expense" as const, id: e.id, label: e.merchant, sub: e.category ?? "" }));

    return NextResponse.json({ results: [...tripResults, ...expenseResults] });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
