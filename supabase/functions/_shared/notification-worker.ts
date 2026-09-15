import { requireEnv } from "./config.ts";

type EdgeRuntimeGlobal = { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } };

// Notifications are queued by a database trigger and delivered by
// process-notifications, which cron only sweeps every five minutes. Without
// this nudge a new order's owner alert could wait that long. Call it once a new
// order or inquiry is stored. The claim lease in claim_notifications makes an
// overlapping cron run harmless, and a failure here only falls back to cron.
export function startNotificationWorker(): void {
  try {
    const task = fetch(`${requireEnv("SUPABASE_URL")}/functions/v1/process-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": requireEnv("CRON_SECRET") },
      body: "{}",
      signal: AbortSignal.timeout(30_000),
    })
      .then((response) => response.body?.cancel())
      .catch((error) => {
        console.error(JSON.stringify({ event: "notification_worker_start_failed", message: error instanceof Error ? error.message : "unknown" }));
      });
    // Keep the request alive after the customer's response has been returned.
    (globalThis as EdgeRuntimeGlobal).EdgeRuntime?.waitUntil(task);
  } catch (error) {
    console.error(JSON.stringify({ event: "notification_worker_start_failed", message: error instanceof Error ? error.message : "unknown" }));
  }
}
