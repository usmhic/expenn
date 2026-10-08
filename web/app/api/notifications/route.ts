import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { pendingApprovals: 0, pendingExpenses: 0, awaitingPayment: 0, rejectedExpenses: 0, draftExpenses: 0, total: 0 };

export async function GET() {
  try {
    const counts = await apiClient({ cookie: (await cookies()).toString() }).notifications();
    // Drafts are a gentle reminder, not an alert, so they don't raise the badge.
    const total = counts.pendingApprovals + counts.pendingExpenses + counts.awaitingPayment + counts.rejectedExpenses;
    return NextResponse.json({ ...counts, total });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
