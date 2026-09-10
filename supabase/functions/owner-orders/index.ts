import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { OWNER_EMAIL, optionalEnv } from "../_shared/config.ts";
import { authenticatedOwner, serviceClient } from "../_shared/db.ts";
import { failure, json, readJson } from "../_shared/http.ts";
import { createCheckoutSession } from "../_shared/stripe.ts";
import { cleanText, sha256, stableStringify } from "../_shared/validation.ts";

function privateQuoteGuide(): Record<string, number> {
  const guide = JSON.parse(optionalEnv("PRIVATE_QUOTE_GUIDE_JSON", "{}"));
  if (!guide || Array.isArray(guide) || typeof guide !== "object" ||
    Object.entries(guide).some(([productId, amount]) => !/^[a-z0-9-]+$/.test(productId) || !Number.isInteger(amount) || Number(amount) <= 0)) {
    throw new Error("Private quote guide is invalid");
  }
  return guide;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!isAllowedOrigin(request)) return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed");
  try {
    const owner = await authenticatedOwner(request);
    if (!owner) return failure(request, 401, "UNAUTHORIZED", "Sign in is required");
    if (owner.email !== OWNER_EMAIL) return failure(request, 403, "FORBIDDEN", "This account is not authorized");
    const client = serviceClient();
    if (request.method === "GET") {
      const url = new URL(request.url);
      if (url.searchParams.get("kind") === "contacts") {
        const { data, error } = await client.from("contact_messages").select("*,notification_outbox(id,template,status,attempts,last_error)").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return json(request, { ok: true, contacts: data });
      }
      let query = client.from("orders").select("*,order_items(*,order_item_components(*)),notification_outbox(id,template,status,attempts,last_error,created_at,sent_at)")
        .order("created_at", { ascending: false }).limit(100);
      const status = cleanText(url.searchParams.get("status"), 40);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return json(request, { ok: true, orders: data, privateQuoteGuide: privateQuoteGuide() });
    }
    if (request.method !== "PATCH") return failure(request, 405, "BAD_REQUEST", "Method not allowed");
    const body = await readJson(request);
    const action = cleanText(body.action, 30);
    const ownerNote = cleanText(body.ownerNote, 2_000);
    if (action === "review_contact") {
      const status = cleanText(body.status, 20);
      const messageId = cleanText(body.messageId, 40);
      if (!["reviewed", "closed", "spam"].includes(status)) return failure(request, 422, "VALIDATION_FAILED", "Invalid contact status");
      if (!/^[0-9a-f-]{36}$/i.test(messageId)) return failure(request, 422, "VALIDATION_FAILED", "Invalid contact ID");
      const { data, error } = await client.from("contact_messages").update({ status }).eq("id", messageId).select("id,status").maybeSingle();
      if (error) throw error;
      if (!data) return failure(request, 404, "NOT_FOUND", "Contact message not found");
      await client.from("audit_events").insert({ actor_email: owner.email, action: `contact_${status}`, contact_message_id: messageId });
      return json(request, { ok: true, ...data });
    }
    const orderId = cleanText(body.orderId, 40);
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return failure(request, 422, "VALIDATION_FAILED", "Invalid order ID");
    const { data: order, error } = await client.from("orders").select("*,order_items(*)").eq("id", orderId).single();
    if (error || !order) return failure(request, 404, "NOT_FOUND", "Order not found");

    if (["decline", "request_changes", "fulfill", "cancel"].includes(action)) {
      const target = action === "decline" ? "declined" : action === "fulfill" ? "fulfilled" : action === "cancel" ? "cancelled" : "changes_requested";
      const allowed = action === "fulfill" ? ["confirmed"]
        : ["quote_requested", "pending_approval", "changes_requested", "payment_setup_pending", "payment_failed", "payment_expired"];
      if (!allowed.includes(order.status)) return failure(request, 409, "CONFLICT", "Order is not in an editable state");
      if (!["fulfill"].includes(action) && !ownerNote) return failure(request, 422, "VALIDATION_FAILED", "Add a message explaining this decision");
      const { data: changed, error: updateError } = await client.from("orders").update({ status: target, owner_note: ownerNote || order.owner_note })
        .eq("id", order.id).eq("status", order.status).select("id,status,public_code").maybeSingle();
      if (updateError) throw updateError;
      if (!changed) return failure(request, 409, "CONFLICT", "Order changed; refresh the inbox");
      await client.from("audit_events").insert({ actor_email: owner.email, action: `order_${target}`, order_id: order.id });
      return json(request, { ok: true, orderId: changed.id, publicCode: changed.public_code, status: changed.status });
    }
    if (action !== "approve") return failure(request, 422, "VALIDATION_FAILED", "Unknown owner action");
    if (optionalEnv("PAYMENTS_ENABLED", "false") !== "true") {
      return failure(request, 409, "PAYMENTS_DISABLED", "Online payment links are not enabled. Reply to the customer by email to arrange next steps");
    }
    if (order.status === "pending_payment" && order.checkout_url && order.checkout_expires_at && new Date(order.checkout_expires_at).getTime() > Date.now()) {
      return json(request, { ok: true, orderId: order.id, publicCode: order.public_code, status: order.status, checkoutUrl: order.checkout_url });
    }

    const hasQuote = order.order_items.some((item: Record<string, unknown>) => item.amount_cents === null);
    const taxCents = Number(body.taxCents);
    const deliveryCents = Number(body.deliveryCents);
    const quoteCents = hasQuote ? Number(body.quotedTotalCents) : null;
    const approvedDate = cleanText(body.approvedDate, 10);
    const approvedWindow = cleanText(body.approvedWindow, 120);
    if (!Number.isInteger(taxCents) || taxCents < 0 || !Number.isInteger(deliveryCents) || deliveryCents < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(approvedDate) || !approvedWindow) {
      return failure(request, 422, "VALIDATION_FAILED", "Set the approved date/time, tax and delivery amount");
    }
    if (hasQuote) {
      const guide = privateQuoteGuide();
      const quoteItems = order.order_items.filter((item: Record<string, unknown>) => item.amount_cents === null);
      if (quoteItems.some((item: Record<string, unknown>) => !Number.isInteger(guide[String(item.product_id)]))) {
        return failure(request, 503, "SERVICE_UNAVAILABLE", "Configure the private quote guide before approving custom desserts");
      }
      const minimum = quoteItems.reduce((sum: number, item: Record<string, unknown>) => sum + guide[String(item.product_id)] * Number(item.pack_quantity), 0) + Number(order.subtotal_cents);
      if (!Number.isInteger(quoteCents) || Number(quoteCents) < minimum) {
        return failure(request, 422, "VALIDATION_FAILED", "Quote is below the approved private starting guide", { quotedTotalCents: `Minimum: $${(minimum / 100).toFixed(2)}` });
      }
    }
    const totalCents = (hasQuote ? Number(quoteCents) : Number(order.subtotal_cents)) + taxCents + deliveryCents;
    if (totalCents < 100 || totalCents > 1_000_000) return failure(request, 422, "VALIDATION_FAILED", "Approved total must be between $1 and $10,000");
    const approvalHash = await sha256(stableStringify({ orderId, totalCents, quoteCents, taxCents, deliveryCents, approvedDate, approvedWindow, ownerNote }));
    const { data: prepared, error: prepareError } = await client.rpc("prepare_checkout", {
      p_order_id: order.id, p_actor: owner.id, p_approval_hash: approvalHash, p_total_cents: totalCents,
      p_quote_cents: quoteCents, p_tax_cents: taxCents, p_delivery_cents: deliveryCents,
      p_date: approvedDate, p_window: approvedWindow, p_note: ownerNote,
    });
    if (prepareError) return failure(request, 409, "CONFLICT", prepareError.code === "23514" ? "Approval is locked or changed. Retry the same details or refresh" : "Could not prepare this approval");
    if (prepared.checkout_url) return json(request, { ok: true, orderId: order.id, publicCode: order.public_code, status: prepared.status, checkoutUrl: prepared.checkout_url });

    const lines = hasQuote
      ? [{ name: `Custom order ${order.public_code}`, offerLabel: "Approved quote", quantity: 1, amountCents: Number(quoteCents) }]
      : order.order_items.map((item: Record<string, unknown>) => ({ name: String(item.product_name), offerLabel: String(item.offer_label), quantity: Number(item.pack_quantity), amountCents: Number(item.amount_cents) }));
    if (taxCents) lines.push({ name: "Tax", offerLabel: "Approved tax", quantity: 1, amountCents: taxCents });
    if (deliveryCents) lines.push({ name: "Delivery", offerLabel: "Approved delivery fee", quantity: 1, amountCents: deliveryCents });
    const checkout = await createCheckoutSession({ orderId: order.id, publicCode: order.public_code, customerEmail: order.customer_email, lines,
      idempotencyKey: `order-${order.id}-checkout-${prepared.checkout_revision}` });
    const { data: updated, error: completeError } = await client.rpc("complete_checkout", {
      p_order_id: order.id, p_revision: prepared.checkout_revision, p_session_id: checkout.id,
      p_url: checkout.url, p_expires_at: checkout.expiresAt ? new Date(checkout.expiresAt * 1000).toISOString() : null,
    });
    if (completeError) throw completeError;
    return json(request, { ok: true, orderId: updated.id, publicCode: updated.public_code, status: updated.status, checkoutUrl: updated.checkout_url });
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_request_failed", message: error instanceof Error ? error.message : "unknown" }));
    return failure(request, 503, "SERVICE_UNAVAILABLE", "The request could not finish. Saved checkout preparations are safe to retry with the same details");
  }
});
