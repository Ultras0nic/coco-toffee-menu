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

test("owner access is magic-link only and stale Checkout links are not exposed", async () => {
  const [ownerHtml, ownerJs, ownerApi] = await Promise.all([
    read("owner.html"), read("owner.js"), read("supabase/functions/owner-orders/index.ts"),
  ]);
  assert.doesNotMatch(ownerHtml, /type="password"/);
  assert.match(ownerJs, /\/auth\/v1\/otp/);
  assert.match(ownerJs, /create_user: false/);
  assert.doesNotMatch(ownerJs, /grant_type=password/);
  assert.match(ownerJs, /order\.status === "pending_payment"/);
  assert.match(ownerApi, /owner\.email !== OWNER_EMAIL/);
  assert.match(ownerApi, /checkout_expires_at.*Date\.now/);
});

test("notification worker uses authenticated leases and customer email uses the saved time field", async () => {
  const [worker, notification] = await Promise.all([
    read("supabase/functions/process-notifications/index.ts"),
    read("supabase/functions/_shared/notifications.ts"),
  ]);
  assert.match(worker, /rpc\("claim_notifications"/);
  assert.match(worker, /owner\.email !== OWNER_EMAIL/);
  assert.match(worker, /eq\("claim_token", notification\.claim_token\)/);
  assert.match(notification, /requestedWindow \?\? fulfillment\.preferredTime/);
  assert.match(notification, /order is not confirmed until Coco & Toffee approves it and payment is completed/i);
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
