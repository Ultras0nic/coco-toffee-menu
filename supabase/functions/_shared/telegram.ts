import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { optionalEnv, ownerInboxUrl, requireEnv } from "./config.ts";

// Telegram alerts are owner-only and deliberately short. They tell the owner an
// order arrived and what it is; the email carries the full record and the
// customer-facing terms.

// Telegram rejects a message whose text exceeds 4096 characters after entity
// parsing. Slicing the finished HTML could cut through a tag or an entity,
// which Telegram also rejects, so every alert would fail and retry until the
// attempt cap. Long customer text is shortened before it is escaped instead;
// these caps keep the whole message well under the limit.
const MESSAGE_TEXT_LIMIT = 3000;
const ORDER_LINE_LIMIT = 20;

export function telegramConfigured(): boolean {
  return Boolean(optionalEnv("TELEGRAM_BOT_TOKEN", "") && optionalEnv("TELEGRAM_CHAT_ID", ""));
}

// Telegram's HTML parse mode needs these three escaped; quotes only matter
// inside attributes, which these messages never build.
function escape(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function shorten(value: unknown, limit: number): string {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}… (continued in owner inbox)` : text;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

async function orderText(client: SupabaseClient, orderId: unknown, template: string): Promise<string> {
  const { data: order, error } = await client.from("orders")
    .select("*, order_items(*)").eq("id", orderId).single();
  if (error || !order) throw new Error("Order is unavailable for notification");

  const event = template.replace(/^owner_order_/, "").replaceAll("_", " ");
  const fulfillment = order.fulfillment && typeof order.fulfillment === "object" ? order.fulfillment : {};
  const items: Array<Record<string, unknown>> = order.order_items || [];
  const lines = items.slice(0, ORDER_LINE_LIMIT).map((item) => {
    const amount = item.line_total_cents == null ? "Custom quote" : money(Number(item.line_total_cents));
    return `• ${escape(shorten(item.product_name, 60))} — ${escape(shorten(item.offer_label, 30))} × ${escape(item.pack_quantity)} · ${escape(amount)}`;
  });
  if (items.length > ORDER_LINE_LIMIT) lines.push(`• …and ${items.length - ORDER_LINE_LIMIT} more in the owner inbox`);

  // total_cents is never null: a new quote request stores its fixed-item
  // subtotal there, so test the status the same way the owner email does.
  const total = order.status === "quote_requested" && !order.quoted_total_cents
    ? `Fixed items ${money(Number(order.subtotal_cents || 0))} · custom pricing to be added`
    : money(Number(order.total_cents));

  return [
    `<b>Order ${escape(order.public_code)} — ${escape(event)}</b>`,
    `${escape(order.customer_name)} · ${escape(order.customer_phone || "no phone")}`,
    escape(order.customer_email),
    `${escape(fulfillment.type || "Fulfillment not given")} · ${escape(fulfillment.requestedDate || "no date")}`
      + ` · ${escape(fulfillment.requestedWindow || fulfillment.preferredTime || "flexible")}`,
    "",
    lines.join("\n"),
    "",
    `<b>Total:</b> ${escape(total)}`,
    `<a href="${escape(ownerInboxUrl())}">Open owner inbox</a>`,
  ].join("\n");
}

async function contactText(client: SupabaseClient, messageId: unknown): Promise<string> {
  const { data: message, error } = await client.from("contact_messages")
    .select("*").eq("id", messageId).single();
  if (error || !message) throw new Error("Contact message is unavailable for notification");

  return [
    `<b>Inquiry ${escape(message.public_code)}</b>`,
    `${escape(message.customer_name)} · ${escape(message.customer_phone || "no phone")}`,
    escape(message.customer_email),
    `Topic: ${escape(message.subject || "General question")}`,
    "",
    escape(shorten(message.message, MESSAGE_TEXT_LIMIT)),
    "",
    `<a href="${escape(ownerInboxUrl())}">Open owner inbox</a>`,
  ].join("\n");
}

export async function sendTelegramNotification(
  client: SupabaseClient,
  notification: Record<string, unknown>,
): Promise<string> {
  const template = String(notification.template);
  const body = notification.order_id
    ? await orderText(client, notification.order_id, template)
    : await contactText(client, notification.contact_message_id);

  const response = await fetch(
    `https://api.telegram.org/bot${requireEnv("TELEGRAM_BOT_TOKEN")}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: requireEnv("TELEGRAM_CHAT_ID"),
        text: body,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  const result = await response.json();
  // Telegram reports its own failures in the body with ok:false, so a 200 alone
  // does not mean the message was delivered.
  if (!response.ok || result.ok !== true) {
    throw new Error(`Telegram failed (${response.status}): ${String(result.description || "unknown").slice(0, 200)}`);
  }
  return `telegram:${result.result?.message_id ?? "sent"}`;
}
