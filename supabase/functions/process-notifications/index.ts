import { OWNER_EMAIL, optionalEnv, requireEnv } from "../_shared/config.ts";
import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { authenticatedOwner, serviceClient } from "../_shared/db.ts";
import { failure, json } from "../_shared/http.ts";
import { sendQueuedNotification } from "../_shared/notifications.ts";

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

  let sent = 0;
  let failed = 0;
  for (const notification of queued || []) {
    try {
      const messageId = await sendQueuedNotification(client, notification);
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
  console.log(JSON.stringify({ event: "notification_batch", actor: owner.email, sent, failed }));
  return json(request, { ok: true, processed: sent + failed, sent, failed, environment: optionalEnv("ENVIRONMENT", "unknown") });
});
