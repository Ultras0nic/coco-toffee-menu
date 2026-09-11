import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { failure, json, readJson } from "../_shared/http.ts";
import { allowRequest } from "../_shared/rate-limit.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { cleanText, clientIp, normalizeCustomerLocale, sha256, stableStringify, validEmail, validIdempotencyKey } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return failure(request, 405, "BAD_REQUEST", "Method not allowed");
  if (!isAllowedOrigin(request)) return failure(request, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed");

  try {
    const body = await readJson(request);
    const customer = body.customer && typeof body.customer === "object" ? body.customer as Record<string, unknown> : {};
    const name = cleanText(customer.name, 120);
    const email = cleanText(customer.email, 254).toLowerCase();
    const phone = cleanText(customer.phone, 40);
    const subject = cleanText(body.subject, 160);
    const message = cleanText(body.message, 4_000);
    const idempotencyKey = cleanText(body.idempotencyKey, 128);
    const token = cleanText(body.turnstileToken, 2_048);
    const locale = normalizeCustomerLocale(body.locale);
    const fields: Record<string, string> = {};

    if (![1, 2].includes(body.schemaVersion) || body.requestType !== "contact") fields.request = "Unsupported request format";
    if (name.length < 2) fields.name = "Enter your name";
    if (!validEmail(email)) fields.email = "Enter a valid email";
    if (message.length < 10) fields.message = "Enter at least 10 characters";
    if (!validIdempotencyKey(idempotencyKey)) fields.idempotencyKey = "Start a new message and try again";
    if (Object.keys(fields).length) return failure(request, 422, "VALIDATION_FAILED", "Please correct the highlighted fields", fields);

    const client = serviceClient();
    if (!await allowRequest(client, request, "contact", email)) {
      return failure(request, 429, "RATE_LIMITED", "Too many attempts. Please wait and try again");
    }
    const requestHash = await sha256(stableStringify({ name, email, phone, subject, message, ...(body.schemaVersion === 2 ? { locale } : {}) }));
    const { data: existing, error: lookupError } = await client.from("contact_messages").select("id,public_code,request_hash").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (existing.request_hash !== requestHash) return failure(request, 409, "CONFLICT", "This submission key was used for different content");
      return json(request, { ok: true, messageId: existing.id, publicCode: existing.public_code, status: "received" });
    }
    if (!await verifyTurnstile(token, clientIp(request))) {
      return failure(request, 403, "SPAM_CHECK_FAILED", "Spam check failed. Refresh and try again");
    }

    const { data, error } = await client.from("contact_messages").insert({
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      customer_name: name,
      customer_email: email,
      customer_phone: phone || null,
      subject: subject || null,
      message,
      customer_locale: locale,
    }).select("id,public_code").single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicate } = await client.from("contact_messages").select("id,public_code,request_hash").eq("idempotency_key", idempotencyKey).single();
        if (!duplicate || duplicate.request_hash !== requestHash) return failure(request, 409, "CONFLICT", "This submission key was used for different content");
        return json(request, { ok: true, messageId: duplicate.id, publicCode: duplicate.public_code, status: "received" });
      }
      throw error;
    }
    return json(request, { ok: true, messageId: data.id, publicCode: data.public_code, status: "received" }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return failure(request, 400, "BAD_REQUEST", "Invalid JSON request");
    console.error(JSON.stringify({ event: "contact_failed", message: error instanceof Error ? error.message : "unknown" }));
    return failure(request, 503, "SERVICE_UNAVAILABLE", "We could not send your message. Please try again");
  }
});
