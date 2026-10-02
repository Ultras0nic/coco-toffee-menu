import { OWNER_EMAIL, optionalEnv, requireEnv } from "../_shared/config.ts";
import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { authenticatedOwner, serviceClient } from "../_shared/db.ts";
import { failure, json } from "../_shared/http.ts";
import { sendQueuedNotification } from "../_shared/notifications.ts";
import { deleteTelegramNotification, telegramConfigured } from "../_shared/telegram.ts";

const URGENT_TEMPLATE = "owner_order_unacknowledged";

async function urgentOrderHandled(client: ReturnType<typeof serviceClient>, notification: Record<string, unknown>): Promise<boolean> {
  if (notification.template !== URGENT_TEMPLATE || !notification.order_id) return false;
  const { data, error } = await client.from("orders").select("owner_acknowledged_at,status")
    .eq("id", notification.order_id).maybeSingle();
  if (error) throw error;
  return !data || Boolean(data.owner_acknowledged_at) || !["quote_requested", "pending_approval"].includes(data.status);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return failure(request, 405, "BAD_REQUEST", "Method not allowed");
  if (!isAllowedOrigin(request)) return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed");
  const cronSecret = request.headers.get("x-cron-secret") || "";
  const owner = cronSecret && cronSecret === requireEnv("CRON_SECRET")
    ? { id: "cron", email: OWNER_EMAIL }
    : await authenticatedOwner(request);
  if (!owner) return failure(request, 401, "UNAUTHORIZED", "Authorization required");
  if (owner.email !== OWNER_EMAIL) return failure(request, 403, "FORBIDDEN", "This account is not authorized");

  const client = serviceClient();
  const { data: queued, error } = await client.rpc("claim_notifications", { p_limit: 20 });
  if (error) return failure(request, 503, "SERVICE_UNAVAILABLE", "Notification queue is unavailable");

  const customerEmailEnabled = optionalEnv("CUSTOMER_EMAIL_ENABLED", "false") === "true";
  let sent = 0;
  let failed = 0;
  let suppressed = 0;
  for (const notification of queued || []) {
    try {
      const isCustomerNotification = String(notification.template || "").startsWith("customer_");
      // The trigger cannot read Edge Function secrets, so it always queues the
      // telegram row and it is suppressed here when no bot is configured.
      const isUnconfiguredTelegram = notification.channel === "telegram" && !telegramConfigured();
      const isHandledUrgentReminder = await urgentOrderHandled(client, notification);
      if ((isCustomerNotification && !customerEmailEnabled) || isUnconfiguredTelegram || isHandledUrgentReminder) {
        const { error: suppressError } = await client.from("notification_outbox").update({
          status: "suppressed",
          provider_message_id: isUnconfiguredTelegram ? "suppressed:no-telegram-bot"
            : isHandledUrgentReminder ? "suppressed:order-acknowledged"
            : "suppressed:no-verified-domain",
          last_error: null,
          claimed_at: null,
          claim_token: null,
        }).eq("id", notification.id).eq("claim_token", notification.claim_token).eq("status", "sending");
        if (suppressError) throw suppressError;
        suppressed += 1;
        continue;
      }
      const messageId = await sendQueuedNotification(client, notification);
      if (notification.template === URGENT_TEMPLATE && await urgentOrderHandled(client, notification)) {
        let deleted = false;
        try {
          deleted = await deleteTelegramNotification(messageId);
        } catch (deleteError) {
          console.error(JSON.stringify({
            event: "urgent_telegram_delete_failed",
            orderId: notification.order_id,
            message: deleteError instanceof Error ? deleteError.message : "unknown",
          }));
        }
        await client.from("notification_outbox").update({
          status: deleted ? "suppressed" : "sent", provider_message_id: messageId, sent_at: new Date().toISOString(),
          last_error: deleted ? null : "Order was acknowledged, but Telegram deletion must be retried",
          claimed_at: null, claim_token: null,
        }).eq("id", notification.id).eq("claim_token", notification.claim_token).eq("status", "sending");
        if (deleted) suppressed += 1;
        else sent += 1;
        continue;
      }
      await client.from("notification_outbox").update({
        status: "sent", provider_message_id: messageId, sent_at: new Date().toISOString(), last_error: null,
        claimed_at: null, claim_token: null,
      }).eq("id", notification.id).eq("claim_token", notification.claim_token).eq("status", "sending");
      sent += 1;
    } catch (sendError) {
      const attempts = Number(notification.attempts);
      const delayMinutes = Math.min(360, 2 ** attempts * 5);
      await client.from("notification_outbox").update({
        status: "failed",
        last_error: (sendError instanceof Error ? sendError.message : "unknown").slice(0, 500),
        next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        claimed_at: null, claim_token: null,
      }).eq("id", notification.id).eq("claim_token", notification.claim_token).eq("status", "sending");
      failed += 1;
    }
  }
  console.log(JSON.stringify({ event: "notification_batch", actor: owner.email, sent, failed, suppressed }));
  return json(request, { ok: true, processed: sent + failed + suppressed, sent, failed, suppressed, environment: optionalEnv("ENVIRONMENT", "unknown") });
});
