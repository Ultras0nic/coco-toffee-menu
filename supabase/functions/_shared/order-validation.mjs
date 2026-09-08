export class ValidationError extends Error {
  constructor(message, fields = {}) { super(message); this.fields = fields; }
}

const MIX_RULES = Object.freeze({
  cookies: { sizes: [6, 12], step: 50, minFlavors: 2, maxFlavors: 3, minUnits: 2 },
  "brownies-blondies": { sizes: [4, 12], step: 50, minFlavors: 1, maxFlavors: 2, minUnits: 1 },
  muffins: { sizes: [6], step: 25, minFlavors: 1, maxFlavors: 3, minUnits: 1 },
  tartlets: { sizes: [4], step: 25, minFlavors: 1, maxFlavors: 3, minUnits: 1 },
});

export function normalizeCart(requestedItems, products, offers) {
  if (!Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 50) {
    throw new ValidationError("Choose between 1 and 50 cart lines", { items: "Invalid cart size" });
  }
  const productById = new Map(products.filter((p) => p.active !== false).map((p) => [p.id, p]));
  const offerById = new Map(offers.filter((o) => o.active !== false).map((o) => [o.id, o]));
  return requestedItems.map((line) => {
    if (!line || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      throw new ValidationError("Each cart line must contain 1–20 packs", { items: "Invalid quantity" });
    }
    const offer = offerById.get(line.offerId);
    const product = offer && productById.get(offer.product_id);
    if (!offer || !product) throw new ValidationError("An offer is no longer available", { items: "Refresh the catalog" });
    const components = line.components;
    if (components == null || (Array.isArray(components) && components.length === 0)) {
      if (product.pricing_mode === "builder") throw new ValidationError("Choose the flavors for this box", { items: "Box is not configured" });
      return { offerId: offer.id, quantity: line.quantity, amountCents: offer.amount_cents, components: [] };
    }
    const rule = MIX_RULES[product.mix_group];
    if (!rule || !rule.sizes.includes(offer.quantity_units) || !Array.isArray(components) ||
      components.length < rule.minFlavors || components.length > rule.maxFlavors) {
      throw new ValidationError("This mix has an invalid box size or flavor count", { items: "Invalid mixed box" });
    }
    const seen = new Set();
    let units = 0;
    let numerator = 0;
    const normalized = components.map((component) => {
      if (!component || !Number.isInteger(component.units) || component.units < rule.minUnits || seen.has(component.productId)) {
        throw new ValidationError("Mixed boxes require distinct flavors and valid quantities", { items: "Invalid flavor allocation" });
      }
      seen.add(component.productId);
      const flavor = productById.get(component.productId);
      if (!flavor || flavor.pricing_mode !== "fixed" || flavor.mix_group !== product.mix_group) {
        throw new ValidationError("A selected flavor is not allowed in this box", { items: "Cross-category mixing is not allowed" });
      }
      const rate = offers.find((candidate) => candidate.active !== false && candidate.product_id === flavor.id && candidate.quantity_units === offer.quantity_units);
      if (!rate || !Number.isInteger(rate.amount_cents)) throw new ValidationError("A flavor has no approved box price", { items: "Refresh the catalog" });
      units += component.units;
      numerator += component.units * rate.amount_cents;
      return { productId: flavor.id, units: component.units };
    });
    if (units !== offer.quantity_units) throw new ValidationError(`This box requires exactly ${offer.quantity_units} items`, { items: "Box is not exactly filled" });
    // Integer numerator avoids floating-point discount drift. One configured box is priced, then pack quantity multiplies it.
    const amountCents = Math.ceil(numerator / (offer.quantity_units * rule.step)) * rule.step;
    return { offerId: offer.id, quantity: line.quantity, amountCents, components: normalized };
  });
}

export function normalizeFulfillment(value, allergyAcknowledged, hasQuote, now = new Date()) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (!["pickup", "delivery"].includes(source.type)) throw new ValidationError("Choose pickup or delivery", { fulfillmentType: "Required" });
  if (allergyAcknowledged !== true) throw new ValidationError("Please acknowledge the allergen information", { allergyAcknowledgement: "Required" });
  const requestedDate = typeof source.requestedDate === "string" ? source.requestedDate : "";
  const parsed = new Date(`${requestedDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== requestedDate) {
    throw new ValidationError("Choose a valid requested date", { requestedDate: "Invalid date" });
  }
  const localToday = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const minimum = new Date(`${localToday}T12:00:00Z`);
  minimum.setUTCDate(minimum.getUTCDate() + (hasQuote ? 7 : 3));
  if (parsed < minimum) throw new ValidationError(`Please allow at least ${hasQuote ? 7 : 3} days`, { requestedDate: "Date is too soon" });
  const result = { type: source.type, requestedDate, requestedWindow: String(source.requestedWindow || "").trim().slice(0, 120), allergyAcknowledged: true };
  if (source.type === "delivery") {
    const address = source.address || {};
    const normalized = {
      line1: String(address.line1 || "").trim().slice(0, 180),
      line2: String(address.line2 || "").trim().slice(0, 100),
      city: String(address.city || "").trim().slice(0, 100),
      state: String(address.state || "").trim().toUpperCase().slice(0, 2),
      postalCode: String(address.postalCode || "").trim().slice(0, 10),
    };
    if (!normalized.line1 || !normalized.city || !/^[A-Z]{2}$/.test(normalized.state) || !/^\d{5}(?:-\d{4})?$/.test(normalized.postalCode)) {
      throw new ValidationError("Enter a complete delivery address", { address: "Street, city, state and ZIP are required" });
    }
    result.address = normalized;
  }
  return result;
}
