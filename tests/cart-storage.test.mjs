import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CART_KEY,
  CART_SCHEMA_VERSION,
  CART_TTL_MS,
  loadStoredCart,
  saveStoredCart,
} from "../cart-storage.mjs";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const line = {
  lineId: "line-1",
  productId: "classic-chocolate-chip",
  offerId: "classic-chocolate-chip:single",
  quantity: 2,
};
const start = Date.parse("2026-09-09T12:00:00.000Z");

test("an unexpired cart restores without extending itself on page load", () => {
  const storage = new MemoryStorage();
  saveStoredCart(storage, [line], start);
  const beforeLoad = storage.getItem(CART_KEY);
  const state = loadStoredCart(storage, start + 24 * 60 * 60 * 1000);

  assert.deepEqual(state, { lines: [line], expired: false, migrated: false });
  assert.equal(storage.getItem(CART_KEY), beforeLoad);
});

test("a cart expires after 72 hours and is removed", () => {
  const storage = new MemoryStorage();
  saveStoredCart(storage, [line], start);
  const state = loadStoredCart(storage, start + CART_TTL_MS);

  assert.deepEqual(state, { lines: [], expired: true, migrated: false });
  assert.equal(storage.getItem(CART_KEY), null);
});

test("meaningful cart activity renews the complete 72-hour window", () => {
  const storage = new MemoryStorage();
  const activityTime = start + 48 * 60 * 60 * 1000;
  saveStoredCart(storage, [line], start);
  saveStoredCart(storage, [line], activityTime);

  const envelope = JSON.parse(storage.getItem(CART_KEY));
  assert.equal(Date.parse(envelope.updatedAt), activityTime);
  assert.equal(Date.parse(envelope.expiresAt), activityTime + CART_TTL_MS);
  assert.equal(loadStoredCart(storage, start + 96 * 60 * 60 * 1000).lines.length, 1);
});

test("a legacy version-one cart migrates once without losing selections", () => {
  const storage = new MemoryStorage();
  storage.setItem(CART_KEY, JSON.stringify({ schemaVersion: 1, lines: [line] }));
  const state = loadStoredCart(storage, start);
  const migrated = JSON.parse(storage.getItem(CART_KEY));

  assert.deepEqual(state, { lines: [line], expired: false, migrated: true });
  assert.equal(migrated.schemaVersion, CART_SCHEMA_VERSION);
  assert.equal(Date.parse(migrated.updatedAt), start);
  assert.equal(Date.parse(migrated.expiresAt), start + CART_TTL_MS);
  assert.deepEqual(migrated.lines, [line]);
});

test("malformed and unsupported cart records are cleared", () => {
  const storage = new MemoryStorage();
  storage.setItem(CART_KEY, "not-json");
  assert.deepEqual(loadStoredCart(storage, start).lines, []);
  assert.equal(storage.getItem(CART_KEY), null);

  storage.setItem(CART_KEY, JSON.stringify({ schemaVersion: 99, lines: [line] }));
  assert.deepEqual(loadStoredCart(storage, start).lines, []);
  assert.equal(storage.getItem(CART_KEY), null);
});

test("saving an empty cart removes the browser record", () => {
  const storage = new MemoryStorage();
  saveStoredCart(storage, [line], start);
  assert.equal(saveStoredCart(storage, [], start + 1), true);
  assert.equal(storage.getItem(CART_KEY), null);
});

test("cart expiration stays browser-only and is wired into cart entry points", async () => {
  const [storageModule, app, html] = await Promise.all([
    readFile(new URL("../cart-storage.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(storageModule, /fetch\s*\(/);
  assert.match(app, /function renewCartActivity\(\)/);
  assert.match(app, /expired after 3 days of inactivity/);
  assert.match(app, /if \(!renewCartActivity\(\)\) return;/);
  assert.match(html, /id="cart-empty-message" aria-live="polite"/);
});
