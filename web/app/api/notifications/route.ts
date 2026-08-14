import { type NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const api = apiClient({ cookie: (await cookies()).toString() });

    const [approvals, summary] = await Promise.all([
      api.trips.getApprovals({ status: "requested" }).catch(() => []),
      api.expenses.summary().catch(() => null),
    ]);

    const pendingApprovals = approvals.length;
    const submittedExpenses = (summary?.submitted ?? 0);
    const missingReceipts = 0; // Not tracked by new API, set to 0
    const total = pendingApprovals + submittedExpenses + missingReceipts;

    return NextResponse.json({ pendingApprovals, submittedExpenses, missingReceipts, total });
  } catch {
    return NextResponse.json({ pendingApprovals: 0, submittedExpenses: 0, missingReceipts: 0, total: 0 });
  }
}
