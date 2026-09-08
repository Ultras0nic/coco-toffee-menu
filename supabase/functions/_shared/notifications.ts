import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { OWNER_EMAIL, optionalEnv, requireEnv, SITE_URL } from "./config.ts";

export async function enqueueOrderNotifications(
  client: SupabaseClient,
  orderId: string,
  publicCode: string,
  customerEmail: string,
  event: "received" | "payment_link" | "paid" | "rejected",
): Promise<void> {
  const rows = [
    { dedupe_key: `order:${orderId}:${event}:owner`, order_id: orderId, recipient: OWNER_EMAIL, template: `owner_order_${event}` },
    { dedupe_key: `order:${orderId}:${event}:customer`, order_id: orderId, recipient: customerEmail, template: `customer_order_${event}` },
  ];
  const { error } = await client.from("notification_outbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) console.error(JSON.stringify({ event: "notification_enqueue_failed", orderId, publicCode, code: error.code }));
}

export async function enqueueContactNotifications(
  client: SupabaseClient,
  messageId: string,
  customerEmail: string,
): Promise<void> {
  const rows = [
    { dedupe_key: `contact:${messageId}:owner`, contact_message_id: messageId, recipient: OWNER_EMAIL, template: "owner_contact_received" },
    { dedupe_key: `contact:${messageId}:customer`, contact_message_id: messageId, recipient: customerEmail, template: "customer_contact_received" },
  ];
  const { error } = await client.from("notification_outbox").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) console.error(JSON.stringify({ event: "notification_enqueue_failed", messageId, code: error.code }));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function orderStatusLabel(value: unknown): string {
  return String(value || "pending review").replaceAll("_", " ");
}

function orderNotice(): string {
  return "Your order is not confirmed until Coco & Toffee approves it and payment is completed.";
}

function cancellationTerms(): string {
  return "Paid cancellations receive a full refund when requested at least 72 hours before regular-item fulfillment or 7 days before custom-dessert fulfillment. Later cancellations are non-refundable unless Coco & Toffee cancels.";
}

export async function sendQueuedNotification(client: SupabaseClient, notification: Record<string, unknown>): Promise<string> {
  let subject = "Coco & Toffee update";
  let html = "";
  if (notification.order_id) {
    const { data: order, error } = await client.from("orders")
      .select("*, order_items(*,order_item_components(*))")
      .eq("id", notification.order_id).single();
    if (error || !order) throw new Error("Order is unavailable for notification");
    const ownerMessage = String(notification.template).startsWith("owner_");
    const event = String(notification.template).replace(/^(owner|customer)_order_/, "");
    subject = ownerMessage
      ? `Order ${order.public_code}: ${event.replaceAll("_", " ")}`
      : event === "payment_link" ? `Payment link for Coco & Toffee order ${order.public_code}`
      : event === "paid" ? `Coco & Toffee order ${order.public_code} is confirmed`
      : `Coco & Toffee order ${order.public_code}: ${event.replaceAll("_", " ")}`;
    const lines = (order.order_items || []).map((item: Record<string, unknown>) => {
      const components = Array.isArray(item.order_item_components)
        ? (item.order_item_components as Array<Record<string, unknown>>).map((component) =>
          `${escapeHtml(component.product_name)} × ${escapeHtml(component.total_units)}`).join(", ")
        : "";
      const lineAmount = item.line_total_cents == null ? "Custom quote" : money(Number(item.line_total_cents));
      return `<li><strong>${escapeHtml(item.product_name)}</strong> — ${escapeHtml(item.offer_label)} × ${escapeHtml(item.pack_quantity)} · ${escapeHtml(lineAmount)}${components ? `<br><small>${components}</small>` : ""}</li>`;
    }).join("");
    const fulfillment = order.fulfillment && typeof order.fulfillment === "object" ? order.fulfillment : {};
    const requestedDate = escapeHtml(fulfillment.requestedDate || "Not provided");
    const requestedTime = escapeHtml(fulfillment.requestedWindow ?? fulfillment.preferredTime ?? "Flexible");
    const approvedSchedule = order.approved_date
      ? `<p><strong>Approved fulfillment:</strong> ${escapeHtml(order.approved_date)} · ${escapeHtml(order.approved_window || "Time to be arranged")}</p>`
      : "";
    const priceSummary = order.status === "quote_requested" && !order.quoted_total_cents
      ? `<p><strong>Current fixed-item subtotal:</strong> ${money(Number(order.subtotal_cents || 0))}<br>Custom-dessert pricing will be added after review.</p>`
      : `<p><strong>Subtotal or approved food total:</strong> ${money(Number(order.quoted_total_cents ?? order.subtotal_cents ?? 0))}<br><strong>Tax:</strong> ${money(Number(order.tax_cents || 0))}<br><strong>Delivery:</strong> ${money(Number(order.delivery_cents || 0))}<br><strong>Total:</strong> ${money(Number(order.total_cents || 0))}</p>`;
    const note = order.owner_note ? `<p><strong>Message from Coco & Toffee:</strong> ${escapeHtml(order.owner_note)}</p>` : "";
    const payment = order.checkout_url && event === "payment_link"
      ? `<p><a href="${escapeHtml(order.checkout_url)}">Pay securely with Stripe</a></p><p>This payment link expires ${escapeHtml(order.checkout_expires_at || "within 24 hours")}. An unpaid link does not reserve the production date.</p>`
      : "";
    const ownerDetails = ownerMessage
      ? `<p><strong>Customer:</strong> ${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_email)} · ${escapeHtml(order.customer_phone || "No phone")}</p><p><a href="${escapeHtml(ownerInboxUrl())}">Open the private owner inbox</a></p>`
      : "";
    html = `<h1>${escapeHtml(subject)}</h1><p><strong>Reference:</strong> ${escapeHtml(order.public_code)}<br><strong>Status:</strong> ${escapeHtml(orderStatusLabel(order.status))}</p>${ownerDetails}<p><strong>Requested date:</strong> ${requestedDate}<br><strong>Preferred time:</strong> ${requestedTime}<br><strong>Fulfillment:</strong> ${escapeHtml(fulfillment.type || "Not provided")}</p>${approvedSchedule}<ul>${lines}</ul>${priceSummary}${note}${payment}<p>${escapeHtml(orderNotice())}</p><p><small>${escapeHtml(cancellationTerms())}</small></p>`;
  } else {
    const { data: message, error } = await client.from("contact_messages").select("*").eq("id", notification.contact_message_id).single();
    if (error || !message) throw new Error("Contact message is unavailable for notification");
    const ownerMessage = String(notification.template).startsWith("owner_");
    subject = ownerMessage ? `New inquiry ${message.public_code}` : `We received your Coco & Toffee inquiry ${message.public_code}`;
    html = ownerMessage
      ? `<h1>${escapeHtml(subject)}</h1><p>From: ${escapeHtml(message.customer_name)} &lt;${escapeHtml(message.customer_email)}&gt; · ${escapeHtml(message.customer_phone || "No phone")}</p><p><strong>Topic:</strong> ${escapeHtml(message.subject || "General question")}</p><p>${escapeHtml(message.message)}</p><p><a href="${escapeHtml(ownerInboxUrl())}">Open the private owner inbox</a></p>`
      : `<h1>${escapeHtml(subject)}</h1><p>Thank you, ${escapeHtml(message.customer_name)}. We received your message and normally reply within 24 hours.</p><p><strong>Reference:</strong> ${escapeHtml(message.public_code)}</p>`;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": String(notification.dedupe_key),
    },
    body: JSON.stringify({
      from: requireEnv("RESEND_FROM_EMAIL"),
      to: [notification.recipient],
      reply_to: OWNER_EMAIL,
      subject,
      html,
      headers: { "List-Unsubscribe": `<mailto:${OWNER_EMAIL}>` },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(`Resend failed (${response.status})`);
  return result.id;
}

export function ownerInboxUrl(): string {
  return optionalEnv("OWNER_INBOX_URL", `${SITE_URL}/owner.html`);
}
