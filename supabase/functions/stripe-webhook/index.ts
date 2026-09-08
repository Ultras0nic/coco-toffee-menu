import { serviceClient } from "../_shared/db.ts";
import { sha256 } from "../_shared/validation.ts";
import { verifyStripeSignature } from "../_shared/stripe.ts";
import { optionalEnv } from "../_shared/config.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    if (!await verifyStripeSignature(rawBody, signature)) return new Response("Invalid signature", { status: 400 });
    const event = JSON.parse(rawBody);
    if (event.livemode !== (optionalEnv("STRIPE_LIVE_MODE", "false") === "true")) return new Response("Wrong payment environment", { status: 400 });
    const session = event.data?.object || {};
    const targets: Record<string, string> = {
      "checkout.session.completed": "paid",
      "checkout.session.async_payment_succeeded": "paid",
      "checkout.session.async_payment_failed": "failed",
      "checkout.session.expired": "expired",
      "charge.refunded": "refunded",
    };
    const target = targets[event.type];
    if (!target) return new Response("Ignored", { status: 200 });
    if (!event.id || typeof event.id !== "string") return new Response("Invalid event", { status: 400 });
    if (target === "paid" && (session.payment_status !== "paid" || session.status !== "complete")) return new Response("Awaiting settled payment", { status: 200 });
    const orderId = session.metadata?.order_id || null;
    if (target !== "refunded" && !/^[0-9a-f-]{36}$/i.test(orderId || "")) return new Response("Unrelated checkout", { status: 200 });
    if (target === "refunded" && orderId && !/^[0-9a-f-]{36}$/i.test(orderId)) return new Response("Invalid order metadata", { status: 400 });
    const amount = target === "refunded" ? session.amount_refunded : session.amount_total;
    if (!Number.isInteger(amount) || amount < 0 || typeof session.currency !== "string") return new Response("Invalid payment data", { status: 400 });

    const client = serviceClient();
    const { error } = await client.rpc("apply_stripe_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload_sha256: await sha256(rawBody),
      p_order_id: orderId,
      p_session_id: session.id || "",
      p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      p_target_status: target,
      p_amount_cents: amount,
      p_currency: session.currency,
      p_paid: session.payment_status === "paid",
    });
    if (error) throw error;
    return new Response("Accepted", { status: 200 });
  } catch (error) {
    console.error(JSON.stringify({ event: "stripe_webhook_failed", message: error instanceof Error ? error.message : "unknown" }));
    return new Response("Retry", { status: 500 });
  }
});
