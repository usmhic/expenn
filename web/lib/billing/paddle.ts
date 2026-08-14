import { createHmac, timingSafeEqual } from "node:crypto";

export type BillingPlan = "free" | "pro";

export const PLAN_LABELS: Record<BillingPlan, string> = {
  free: "Free",
  pro: "Pro",
};

export const PRICE_PER_PAID_USER = 7;

export const FREE_INCLUDED_USERS = 2; // owner + 1 additional

export function paddleApiBase() {
  return process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function getPaddlePriceId() {
  return process.env.PADDLE_PRICE_ID ?? "";
}

export function billingStatusFromPaddle(status?: string | null) {
  if (status === "active") return "active";
  if (status === "trialing" || status === "trial") return "trialing";
  if (status === "past_due" || status === "past_due_payment") return "past_due";
  if (status === "canceled" || status === "cancelled" || status === "paused") return "canceled";
  return "active";
}

/** Clamps paid-seat quantity to a valid Paddle range (1–999). */
export function checkoutQuantity(seats: number) {
  return Math.max(1, Math.min(999, Math.floor(Number.isFinite(seats) ? seats : 1)));
}

/** Maximum total members allowed given the number of paid seats. */
export function maxMembers(paidSeats: number) {
  return FREE_INCLUDED_USERS + Math.max(0, paidSeats);
}

export async function createPaddleCheckout({
  seats,
  organizationId,
  workspaceSlug,
  userId,
  email,
}: {
  seats: number;
  organizationId: string;
  workspaceSlug: string;
  userId: string;
  email: string;
}) {
  const apiKey = process.env.PADDLE_API_KEY;
  const priceId = getPaddlePriceId();
  if (!apiKey) throw new Error("PADDLE_API_KEY is not configured.");
  if (!priceId) throw new Error("PADDLE_PRICE_ID is not configured.");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const quantity = checkoutQuantity(seats);
  const response = await fetch(`${paddleApiBase()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity }],
      collection_mode: "automatic",
      custom_data: {
        seats: quantity,
        organizationId,
        workspaceSlug,
        userId,
        email,
      },
      checkout: {
        url: `${appUrl}/checkout/return?workspace=${encodeURIComponent(workspaceSlug)}`,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: { id?: string; checkout?: { url?: string | null } };
    error?: { detail?: string; message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.detail ?? payload?.error?.message ?? "Paddle checkout could not be created.");
  }

  const checkoutUrl = payload?.data?.checkout?.url;
  if (!checkoutUrl) {
    throw new Error("Paddle did not return a checkout URL. Check your Paddle default checkout settings.");
  }

  return { transactionId: payload?.data?.id ?? null, checkoutUrl, priceId, quantity };
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(";").map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")] as const;
    })
  );
  const timestamp = parts.get("ts");
  const signature = parts.get("h1");
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}:${rawBody}`).digest("hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
}
