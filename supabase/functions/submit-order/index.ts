import { isAllowedOrigin, optionsResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { failure, json, readJson } from "../_shared/http.ts";
import { normalizeCart, normalizeFulfillment, ValidationError } from "../_shared/order-validation.mjs";
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
    const notes = cleanText(body.notes, 2_000);
    const idempotencyKey = cleanText(body.idempotencyKey, 128);
    const token = cleanText(body.turnstileToken, 2_048);
    const locale = normalizeCustomerLocale(body.locale);
    const items = Array.isArray(body.items) ? body.items : [];
    const fields: Record<string, string> = {};

    if (![1, 2].includes(body.schemaVersion) || body.requestType !== "order") fields.request = "Unsupported request format";
    if (name.length < 2) fields.name = "Enter your name";
    if (!validEmail(email)) fields.email = "Enter a valid email";
    if (!validIdempotencyKey(idempotencyKey)) fields.idempotencyKey = "Start a new submission and try again";
    if (items.length < 1 || items.length > 50) fields.items = "Choose at least one item";
    for (const item of items) {
      if (!item || typeof item !== "object" || !cleanText((item as Record<string, unknown>).offerId, 160) ||
        !Number.isInteger((item as Record<string, unknown>).quantity) || Number((item as Record<string, unknown>).quantity) < 1 ||
        Number((item as Record<string, unknown>).quantity) > 20) {
        fields.items = "One or more cart items are invalid";
        break;
      }
    }
    if (Object.keys(fields).length) return failure(request, 422, "VALIDATION_FAILED", "Please correct the highlighted fields", fields);

    const client = serviceClient();
    if (!await allowRequest(client, request, "submit-order", email)) {
      return failure(request, 429, "RATE_LIMITED", "Too many attempts. Please wait and try again");
    }
    const requestHash = await sha256(stableStringify({ customer: { name, email, phone }, items, fulfillment: body.fulfillment, allergyAcknowledged: body.allergyAcknowledged, notes, ...(body.schemaVersion === 2 ? { locale } : {}) }));
    const { data: existing, error: lookupError } = await client.from("orders")
      .select("id,public_code,status,request_hash").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (existing.request_hash !== requestHash) return failure(request, 409, "CONFLICT", "This submission key was already used for different content");
      return json(request, { ok: true, orderId: existing.id, publicCode: existing.public_code, status: existing.status });
    }
    if (!await verifyTurnstile(token, clientIp(request))) {
      return failure(request, 403, "SPAM_CHECK_FAILED", "Spam check failed. Refresh and try again");
    }

    const [{ data: products, error: productsError }, { data: offers, error: offersError }] = await Promise.all([
      client.from("products").select("id,name,pricing_mode,mix_group,active").eq("active", true),
      client.from("offers").select("id,product_id,offer_key,quantity_units,amount_cents,active").eq("active", true),
    ]);
    if (productsError || offersError) throw productsError || offersError;
    const normalizedItems = normalizeCart(items, products || [], offers || []);
    const hasQuote = normalizedItems.some((item: { amountCents: number | null }) => item.amountCents === null);
    const fulfillment = normalizeFulfillment(body.fulfillment, body.allergyAcknowledged, hasQuote);
    const { data, error } = await client.rpc(body.schemaVersion === 2 ? "create_order_request_v2" : "create_order_request", {
      p_idempotency_key: idempotencyKey,
      p_customer_name: name,
      p_customer_email: email,
      p_customer_phone: phone,
      p_fulfillment: fulfillment,
      p_items: normalizedItems,
      p_notes: notes,
      p_request_hash: requestHash,
      ...(body.schemaVersion === 2 ? { p_customer_locale: locale } : {}),
    });
    if (error) {
      if (error.code === "23514") return failure(request, 409, "CONFLICT", "This submission key was already used for different content");
      if (error.code === "22023") return failure(request, 422, "VALIDATION_FAILED", "Please check the cart and requested date");
      throw error;
    }

    return json(request, {
      ok: true,
      orderId: data.id,
      publicCode: data.publicCode,
      status: data.status,
    }, data.duplicate ? 200 : 201);
  } catch (error) {
    if (error instanceof ValidationError) return failure(request, 422, "VALIDATION_FAILED", error.message, error.fields);
    if (error instanceof SyntaxError) return failure(request, 400, "BAD_REQUEST", "Invalid JSON request");
    console.error(JSON.stringify({ event: "submit_order_failed", message: error instanceof Error ? error.message : "unknown" }));
    return failure(request, 503, "SERVICE_UNAVAILABLE", "We could not submit the request. Your cart is still saved; please try again");
  }
});
