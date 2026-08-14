import { NextResponse } from "next/server";
import { billingStatusFromPaddle, verifyPaddleSignature } from "@/lib/billing/paddle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOTNET_API_URL = process.env.DOTNET_API_URL ?? "http://localhost:5000";

type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    customer_id?: string | null;
    subscription_id?: string | null;
    custom_data?: Record<string, unknown> | null;
    current_billing_period?: { ends_at?: string | null } | null;
    items?: Array<{
      price?: { id?: string | null };
      price_id?: string | null;
      quantity?: number | null;
    }>;
  };
};

function customData(data: PaddleEvent["data"]) {
  return (data?.custom_data ?? {}) as {
    organizationId?: string;
    seats?: number;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const secret = process.env.DOTNET_INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "DOTNET_INTERNAL_SECRET is required" }, { status: 500 });
  }

  const event = JSON.parse(rawBody) as PaddleEvent;
  const data = event.data;
  const custom = customData(data);
  const organizationId = custom.organizationId;
  if (!organizationId) return NextResponse.json({ ok: true, skipped: "missing organizationId" });

  const isCanceled = event.event_type === "subscription.canceled";
  const paidSeats = isCanceled
    ? 0
    : Math.max(1, Number(custom.seats ?? data?.items?.[0]?.quantity ?? 1));
  const plan = isCanceled ? "free" : "pro";
  const status = isCanceled ? "canceled" : billingStatusFromPaddle(data?.status);
  const periodEnd = data?.current_billing_period?.ends_at ?? null;

  const res = await fetch(`${DOTNET_API_URL}/api/internal/billing/${organizationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": secret,
    },
    body: JSON.stringify({
      plan,
      billingStatus: status,
      paidSeats,
      paddleCustomerId: data?.customer_id ?? undefined,
      paddleSubscriptionId: data?.subscription_id ?? data?.id ?? undefined,
      currentPeriodEndsAt: periodEnd,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update billing" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
