export const CART_KEY = "coco-toffee-order-bag-v1";
export const CART_SCHEMA_VERSION = 2;
export const CART_TTL_MS = 72 * 60 * 60 * 1000;

function validLine(line) {
  return typeof line?.productId === "string"
    && typeof line.offerId === "string"
    && Number.isInteger(line.quantity)
    && line.quantity > 0
    && line.quantity <= 20;
}

function validLines(lines) {
  return Array.isArray(lines) ? lines.slice(0, 50).filter(validLine) : [];
}

function cartEnvelope(lines, now) {
  return {
    schemaVersion: CART_SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CART_TTL_MS).toISOString(),
    lines,
  };
}

function removeStoredCart(storage) {
  try { storage.removeItem(CART_KEY); } catch { /* Storage can be disabled. */ }
}

export function loadStoredCart(storage, now = Date.now()) {
  let raw;
  try { raw = storage.getItem(CART_KEY); } catch { return { lines: [], expired: false, migrated: false }; }
  if (!raw) return { lines: [], expired: false, migrated: false };

  let value;
  try { value = JSON.parse(raw); }
  catch {
    removeStoredCart(storage);
    return { lines: [], expired: false, migrated: false };
  }

  const lines = validLines(value?.lines);
  if (!lines.length) {
    removeStoredCart(storage);
    return { lines: [], expired: false, migrated: false };
  }

  if (value.schemaVersion === 1) {
    try { storage.setItem(CART_KEY, JSON.stringify(cartEnvelope(lines, now))); }
    catch { /* Keep the migrated cart in memory when storage is unavailable. */ }
    return { lines, expired: false, migrated: true };
  }

  const updatedAt = Date.parse(value.updatedAt);
  const expiresAt = Date.parse(value.expiresAt);
  const timestampsAreValid = value.schemaVersion === CART_SCHEMA_VERSION
    && Number.isFinite(updatedAt)
    && Number.isFinite(expiresAt)
    && expiresAt > updatedAt
    && expiresAt - updatedAt === CART_TTL_MS;

  if (!timestampsAreValid) {
    removeStoredCart(storage);
    return { lines: [], expired: false, migrated: false };
  }

  if (now >= expiresAt) {
    removeStoredCart(storage);
    return { lines: [], expired: true, migrated: false };
  }

  return { lines, expired: false, migrated: false };
}

export function saveStoredCart(storage, lines, now = Date.now()) {
  const safeLines = validLines(lines);
  if (!safeLines.length) {
    removeStoredCart(storage);
    return true;
  }
  try {
    storage.setItem(CART_KEY, JSON.stringify(cartEnvelope(safeLines, now)));
    return true;
  } catch {
    return false;
  }
}
