import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { normalizeCart, normalizeFulfillment, ValidationError } from "../functions/_shared/order-validation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const read = (path) => readFile(resolve(root, path), "utf8");

const products = [
  { id: "classic", name: "Classic", pricing_mode: "fixed", mix_group: "cookies", active: true },
  { id: "cocoa", name: "Cocoa", pricing_mode: "fixed", mix_group: "cookies", active: true },
  { id: "macadamia", name: "Macadamia", pricing_mode: "fixed", mix_group: "cookies", active: true },
  { id: "muffin", name: "Muffin", pricing_mode: "fixed", mix_group: "muffins", active: true },
  { id: "assorted", name: "Assorted", pricing_mode: "builder", mix_group: "cookies", active: true },
  { id: "cake", name: "Cake", pricing_mode: "quote", mix_group: null, active: true },
];
const offers = [
  { id: "classic:single", product_id: "classic", quantity_units: 1, amount_cents: 425, active: true },
  { id: "classic:6-pack", product_id: "classic", quantity_units: 6, amount_cents: 2300, active: true },
  { id: "cocoa:6-pack", product_id: "cocoa", quantity_units: 6, amount_cents: 2600, active: true },
  { id: "macadamia:6-pack", product_id: "macadamia", quantity_units: 6, amount_cents: 3250, active: true },
  { id: "assorted:6-pack", product_id: "assorted", quantity_units: 6, amount_cents: 2300, active: true },
  { id: "muffin:6-pack", product_id: "muffin", quantity_units: 6, amount_cents: 4400, active: true },
  { id: "cake:quote", product_id: "cake", quantity_units: 1, amount_cents: null, active: true },
];

test("server ignores browser totals and reloads the authoritative offer amount", () => {
  const [line] = normalizeCart([{ offerId: "classic:single", quantity: 2, amountCents: 1 }], products, offers);
  assert.deepEqual(line, { offerId: "classic:single", quantity: 2, amountCents: 425, components: [] });
});

test("mixed cookies retain premium flavor rates and round upward to fifty cents", () => {
  const [line] = normalizeCart([{
    offerId: "assorted:6-pack", quantity: 1,
    components: [{ productId: "classic", units: 2 }, { productId: "cocoa", units: 2 }, { productId: "macadamia", units: 2 }],
  }], products, offers);
  assert.equal(line.amountCents, 2750);
});

test("server rejects cross-category, duplicate, underfilled and oversized mixed boxes", () => {
  const invalid = [
    [{ productId: "classic", units: 3 }, { productId: "muffin", units: 3 }],
    [{ productId: "classic", units: 3 }, { productId: "classic", units: 3 }],
    [{ productId: "classic", units: 2 }, { productId: "cocoa", units: 2 }],
    [{ productId: "classic", units: 7 }, { productId: "cocoa", units: 6 }],
  ];
  for (const components of invalid) {
    assert.throws(() => normalizeCart([{ offerId: "assorted:6-pack", quantity: 1, components }], products, offers), ValidationError);
  }
});

test("fulfillment enforces allergy, address, and three/seven day lead times", () => {
  const now = new Date("2026-09-08T16:00:00Z");
  assert.equal(normalizeFulfillment({ type: "pickup", requestedDate: "2026-09-11", requestedWindow: "morning" }, true, false, now).requestedWindow, "morning");
  assert.throws(() => normalizeFulfillment({ type: "pickup", requestedDate: "2026-09-14" }, true, true, now), ValidationError);
  assert.equal(normalizeFulfillment({ type: "delivery", requestedDate: "2026-09-15", address: { line1: "1 Main St", city: "Boston", state: "ma", postalCode: "02108" } }, true, true, now).address.state, "MA");
  assert.throws(() => normalizeFulfillment({ type: "delivery", requestedDate: "2026-09-15", address: {} }, true, true, now), ValidationError);
  assert.throws(() => normalizeFulfillment({ type: "pickup", requestedDate: "2026-09-15" }, false, true, now), ValidationError);
});

test("workflow SQL is idempotent, exact-amount, retry-safe, and private by default", async () => {
  const [base, workflow] = await Promise.all([
    read("supabase/migrations/202609030001_commerce.sql"),
    read("supabase/migrations/202609030003_workflow_integrity.sql"),
  ]);
  assert.match(base, /enable row level security/g);
  assert.match(base, /revoke all on public\.products,public\.offers,public\.orders/);
  assert.doesNotMatch(base, /private_quote_start_cents/i);
  assert.match(workflow, /provider event id was reused with different content/);
  assert.match(workflow, /checkout session has not committed yet; retry event/);
  assert.match(workflow, /p_amount_cents is distinct from v_order\.total_cents/);
  assert.match(workflow, /p_currency is distinct from v_order\.currency/);
  assert.match(workflow, /for update skip locked/);
  assert.match(workflow, /attempts<10/);
});

test("owner access is magic-link only and payment controls are disabled for request-only launch", async () => {
  const [ownerHtml, ownerJs, ownerApi, ownerConfig, functionConfig] = await Promise.all([
    read("owner.html"), read("owner.js"), read("supabase/functions/owner-orders/index.ts"),
    read("owner-config.js"), read("supabase/config.toml"),
  ]);
  assert.doesNotMatch(ownerHtml, /type="password"/);
  assert.match(ownerJs, /\/auth\/v1\/otp/);
  assert.match(ownerJs, /create_user: false/);
  assert.doesNotMatch(ownerJs, /grant_type=password/);
  assert.match(ownerJs, /const PAYMENTS_ENABLED = config\.paymentsEnabled === true/);
  assert.match(ownerJs, /Reply by email/);
  assert.match(ownerConfig, /paymentsEnabled:\s*false/);
  assert.match(ownerApi, /owner\.email !== OWNER_EMAIL/);
  assert.match(ownerApi, /optionalEnv\("PAYMENTS_ENABLED", "false"\) !== "true"/);
  assert.doesNotMatch(functionConfig, /\[functions\.stripe-webhook\]/);
});

test("notification worker sends owner alerts and suppresses customer mail until a domain is verified", async () => {
  const [worker, notification, requestOnlyMigration, cronMigration] = await Promise.all([
    read("supabase/functions/process-notifications/index.ts"),
    read("supabase/functions/_shared/notifications.ts"),
    read("supabase/migrations/202609100001_request_only_mode.sql"),
    read("supabase/migrations/202609100002_notification_cron.sql"),
  ]);
  assert.match(worker, /rpc\("claim_notifications"/);
  assert.match(worker, /owner\.email !== OWNER_EMAIL/);
  assert.match(worker, /eq\("claim_token", notification\.claim_token\)/);
  assert.match(worker, /optionalEnv\("CUSTOMER_EMAIL_ENABLED", "false"\)/);
  assert.match(worker, /status: "suppressed"/);
  assert.match(requestOnlyMigration, /'suppressed'/);
  assert.match(cronMigration, /cron\.schedule/);
  assert.match(cronMigration, /vault\.decrypted_secrets/);
  assert.match(cronMigration, /x-cron-secret/);
  assert.doesNotMatch(cronMigration, /(?:sb_secret_|re_[A-Za-z0-9]{20}|whsec_)/);
  assert.match(notification, /requestedWindow \?\? fulfillment\.preferredTime/);
  assert.match(notification, /This is an order request, not a confirmed order/i);
});

test("Stripe session and webhook bind order, payment intent, exact amount, and live mode", async () => {
  const [stripe, webhook] = await Promise.all([
    read("supabase/functions/_shared/stripe.ts"), read("supabase/functions/stripe-webhook/index.ts"),
  ]);
  assert.match(stripe, /payment_intent_data\[metadata\]\[order_id\]/);
  assert.match(stripe, /Idempotency-Key/);
  assert.match(stripe, /expires_at/);
  assert.match(webhook, /STRIPE_LIVE_MODE/);
  assert.match(webhook, /verifyStripeSignature/);
  assert.match(webhook, /p_amount_cents: amount/);
  assert.match(webhook, /p_currency: session\.currency/);
});

test("public catalog seed contains no internal costs or private quote guide amounts", async () => {
  const seed = await read("supabase/migrations/202609030002_seed_catalog.sql");
  assert.doesNotMatch(seed, /full.?cost|private_quote|quote_guide/i);
  assert.doesNotMatch(seed, /private_quote_start_cents/i);
});

test("versioned customer locale storage remains compatible with legacy requests", async () => {
  const [migration, order, contact, validation, owner, notifications] = await Promise.all([
    read("supabase/migrations/202609110001_customer_locale.sql"),
    read("supabase/functions/submit-order/index.ts"),
    read("supabase/functions/contact/index.ts"),
    read("supabase/functions/_shared/validation.ts"),
    read("owner.js"),
    read("supabase/functions/_shared/notifications.ts"),
  ]);
  assert.match(migration, /customer_locale text not null default 'en'/);
  assert.match(migration, /create_order_request_v2/);
  assert.match(migration, /'en', 'pt-PT', 'es-ES', 'zh-Hans'/);
  assert.match(order, /\[1, 2\]\.includes\(body\.schemaVersion\)/);
  assert.match(order, /create_order_request_v2/);
  assert.match(order, /body\.schemaVersion === 2 \? \{ locale \} : \{\}/);
  assert.match(contact, /customer_locale: locale/);
  assert.match(validation, /normalizeCustomerLocale/);
  assert.match(owner, /Customer language:/);
  assert.match(notifications, /Customer language:/);
});
