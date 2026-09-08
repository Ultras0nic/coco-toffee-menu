import { requireEnv, SITE_URL } from "./config.ts";

export interface CheckoutLine {
  name: string;
  offerLabel: string;
  quantity: number;
  amountCents: number;
}

export interface CheckoutResult {
  id: string;
  url: string;
  expiresAt?: number;
}

export async function createCheckoutSession(input: {
  orderId: string;
  publicCode: string;
  customerEmail: string;
  lines: CheckoutLine[];
  idempotencyKey: string;
}): Promise<CheckoutResult> {
  if (!/^[0-9a-f-]{36}$/i.test(input.orderId) || !/^[A-Z0-9]{6,20}$/.test(input.publicCode)) {
    throw new Error("Checkout identity is invalid");
  }
  if (input.lines.length < 1 || input.lines.length > 50 || input.lines.some((line) =>
    !line.name || !line.offerLabel || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20 ||
    !Number.isInteger(line.amountCents) || line.amountCents < 1 || line.amountCents > 1_000_000)) {
    throw new Error("Checkout line items are invalid");
  }
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("client_reference_id", input.orderId);
  body.set("customer_email", input.customerEmail);
  body.set("success_url", `${SITE_URL}/?order=${encodeURIComponent(input.publicCode)}&payment=success`);
  body.set("cancel_url", `${SITE_URL}/?order=${encodeURIComponent(input.publicCode)}&payment=cancelled`);
  body.set("metadata[order_id]", input.orderId);
  body.set("metadata[public_code]", input.publicCode);
  body.set("payment_intent_data[metadata][order_id]", input.orderId);
  body.set("payment_intent_data[metadata][public_code]", input.publicCode);
  body.set("expires_at", String(Math.floor(Date.now() / 1000) + (23 * 60 * 60) + (55 * 60)));

  input.lines.forEach((line, index) => {
    const prefix = `line_items[${index}]`;
    body.set(`${prefix}[quantity]`, String(line.quantity));
    body.set(`${prefix}[price_data][currency]`, "usd");
    body.set(`${prefix}[price_data][unit_amount]`, String(line.amountCents));
    body.set(`${prefix}[price_data][product_data][name]`, `${line.name} — ${line.offerLabel}`);
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.idempotencyKey,
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok || !result.id || !result.url) {
    throw new Error(`Stripe checkout creation failed (${response.status}): ${result.error?.code || "unknown"}`);
  }
  return { id: result.id, url: result.url, expiresAt: result.expires_at };
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
  const parts = signatureHeader.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0 || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requireEnv("STRIPE_WEBHOOK_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  return signatures.some((candidate) => /^[0-9a-f]{64}$/.test(candidate) && constantTimeEqual(expected, candidate));
}
