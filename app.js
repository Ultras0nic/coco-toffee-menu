import { loadStoredCart, saveStoredCart } from "./cart-storage.mjs";

async function loadMenuData() {
  const response = await fetch("./data/menu.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Menu data request failed: ${response.status}`);
  return response.json();
}

const DEFAULT_EMPTY_CART_MESSAGE = "Your order bag is waiting for something delicious.";
const EXPIRED_CART_MESSAGE = "Your saved order bag expired after 3 days of inactivity. Please choose your items again.";
let menuCategories = [];
let selectionChecklist = [];
let menuAssetVersion = "";
let pricingCatalog = {};

try {
  ({ menuCategories, selectionChecklist, assetVersion: menuAssetVersion, pricingCatalog } = await loadMenuData());
} catch (error) {
  console.error(error);
  document.querySelector("#menu-sections").innerHTML = `<section class="data-error" role="alert"><h2>Menu temporarily unavailable</h2><p>Please refresh the page or contact Coco & Toffee directly.</p></section>`;
  throw error;
}

const byId = (id) => document.querySelector(`#${id}`);
const el = Object.fromEntries([
  "category-nav-list", "menu-sections", "product-preview", "mobile-scrim", "preview-image",
  "preview-placeholder", "product-peek", "product-peek-image", "product-peek-placeholder",
  "product-peek-name", "selection-list", "copy-checklist", "copy-status", "product-order-form",
  "offer-fieldset", "offer-options", "quote-fields", "quote-servings", "quote-occasion",
  "quote-details", "product-quantity", "product-quantity-minus", "product-quantity-plus",
  "add-to-cart", "product-order-note", "cart-toggle", "cart-count", "cart-drawer", "cart-close",
  "mix-builder", "mix-toggle-label", "mix-toggle", "mix-builder-fields", "mix-builder-help",
  "mix-components", "mix-total",
  "cart-empty", "cart-empty-message", "cart-content", "cart-items", "cart-subtotal", "cart-savings", "cart-quote-note",
  "cart-browse", "cart-continue", "checkout-start", "checkout-panel", "checkout-close",
  "checkout-kicker", "checkout-title", "checkout-review", "checkout-review-items",
  "checkout-review-total", "checkout-next", "checkout-edit", "order-form", "order-error-summary",
  "delivery-address", "checkout-back", "order-submit", "order-submit-status", "order-result",
  "order-result-title", "order-result-message", "order-code", "checkout-payment-link", "copy-order",
  "order-result-close", "copy-order-status", "contact-form", "contact-submit", "contact-status",
  "order-turnstile", "contact-turnstile",
  "order-email-link", "order-sms-link", "contact-email-link", "contact-sms-link",
  "order-copy-draft", "order-email-draft", "order-sms-draft", "order-summary-text",
  "product-view-bag", "order-lead-time",
].map((id) => [id, byId(id)]));

const previewClose = document.querySelector(".preview-close");
const scrim = el["mobile-scrim"];
const itemIndex = new Map();
let activeButton = null;
let activeProduct = null;
let peekButton = null;
let activeOverlay = null;
let overlayReturnFocus = null;
let orderIdempotencyKey = null;
let contactIdempotencyKey = null;
let lastOrderSummary = "";
let editingLineId = null;
let orderSubmitting = false;
let contactSubmitting = false;
const initialCartState = loadStoredCart(localStorage);
let cartExpiredNotice = initialCartState.expired;
let cart = initialCartState.lines;
const turnstile = { order: { token: "", widgetId: null }, contact: { token: "", widgetId: null } };

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

function isCompactInteraction() {
  return window.matchMedia("(max-width: 820px), (hover: none), (pointer: coarse)").matches;
}

function createKey() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function endpointFor(path) {
  const base = document.querySelector('meta[name="order-endpoint"]')?.content.trim();
  if (!base) return null;
  try { return new URL(path, base.endsWith("/") ? base : `${base}/`).href; } catch { return null; }
}

function smsHref(message) {
  const configuredRecipient = document.querySelector('meta[name="sms-recipient"]')?.content.trim() || "";
  const recipient = /^\+?[1-9]\d{7,14}$/.test(configuredRecipient) ? configuredRecipient : "";
  const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?";
  return `sms:${recipient}${separator}body=${encodeURIComponent(message)}`;
}

function turnstileSiteKey() {
  return document.querySelector('meta[name="turnstile-site-key"]')?.content.trim() || "";
}

function resetTurnstile(kind) {
  turnstile[kind].token = "";
  if (turnstile[kind].widgetId !== null && window.turnstile) window.turnstile.reset(turnstile[kind].widgetId);
}

function initTurnstile() {
  const sitekey = turnstileSiteKey();
  if (!sitekey) return;
  for (const node of [el["order-turnstile"], el["contact-turnstile"]]) node.hidden = false;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    for (const kind of ["order", "contact"]) {
      turnstile[kind].widgetId = window.turnstile.render(el[`${kind}-turnstile`], {
        sitekey,
        theme: "light",
        callback: (token) => { turnstile[kind].token = token; },
        "expired-callback": () => { turnstile[kind].token = ""; },
        "error-callback": () => { turnstile[kind].token = ""; },
      });
    }
  };
  script.onerror = () => {
    el["order-submit-status"].textContent = "The security check could not load. Please refresh and try again.";
    el["contact-status"].textContent = "The security check could not load. Please refresh and try again.";
  };
  document.head.append(script);
}

function saveCart() {
  cartExpiredNotice = false;
  if (!saveStoredCart(localStorage, cart)) el["product-order-note"].textContent = "Your bag works in this tab, but this browser could not save it for later.";
  orderIdempotencyKey = null;
}

function renewCartActivity() {
  const state = loadStoredCart(localStorage);
  if (state.expired) {
    cart = [];
    cartExpiredNotice = true;
    renderCart();
    return false;
  }
  if (cart.length) saveCart();
  return Boolean(cart.length);
}

function saveDraft(form, key) {
  const values = {};
  for (const field of form.elements) {
    if (!field.name || field.name.startsWith("cf-") || field.type === "submit") continue;
    if (field.type === "radio" && !field.checked) continue;
    values[field.name] = field.type === "checkbox" ? field.checked : field.value;
  }
  try { sessionStorage.setItem(key, JSON.stringify(values)); } catch { /* Keep the current form usable. */ }
}

function restoreDraft(form, key) {
  try {
    const values = JSON.parse(sessionStorage.getItem(key));
    if (!values || typeof values !== "object") return;
    for (const field of form.elements) {
      if (!(field.name in values)) continue;
      if (field.type === "checkbox") field.checked = values[field.name] === true;
      else if (field.type === "radio") field.checked = field.value === values[field.name];
      else field.value = String(values[field.name]);
    }
  } catch { /* A missing or invalid draft is harmless. */ }
}

function clearDraft(key) {
  try { sessionStorage.removeItem(key); } catch { /* Storage can be disabled. */ }
}

function offerKey(offer, item) {
  if (offer.id === "quote" || item.pricing?.mode === "quote") return "quote";
  if (item.id === "assorted-individual-tartlets") return "assorted-4";
  const key = offer.id || "";
  if (["each", "single"].includes(key) || offer.units === 1) return "single";
  if (["pack-4", "4-pack"].includes(key) || offer.units === 4) return "4-pack";
  if (["pack-6", "6-pack"].includes(key) || offer.units === 6) return "6-pack";
  if (key === "dozen" || offer.units === 12) return "dozen";
  return key;
}

function normalizedPricing(item) {
  if (item.pricing?.mode) {
    return {
      ...item.pricing,
      offers: (item.pricing.offers || []).map((offer) => ({ ...offer, key: offerKey(offer, item), fullId: `${item.id}:${offerKey(offer, item)}` })),
    };
  }
  if (item.price === "Custom quote") {
    return { mode: "quote", offers: [{ id: "quote", key: "quote", fullId: `${item.id}:quote`, label: "Custom quote", units: 1, priceCents: null, compareAtCents: null }] };
  }
  if (item.id === "assorted-individual-tartlets") {
    return { mode: "builder", mixGroup: "tartlets", offers: [{ id: "assorted-4", key: "assorted-4", fullId: `${item.id}:assorted-4`, label: "4-count assortment", units: 4, priceCents: 3075, compareAtCents: null }] };
  }
  return null;
}

function getRecord(line) {
  const record = itemIndex.get(line.productId);
  const pricing = record && normalizedPricing(record.item);
  const offer = pricing?.offers.find((candidate) => candidate.fullId === line.offerId);
  return record && pricing && offer ? { ...record, pricing, offer } : null;
}

function renderMenu() {
  el["category-nav-list"].innerHTML = menuCategories.map((category) => `<a href="#${escapeHtml(category.id)}">${escapeHtml(category.name)}</a>`).join("");
  el["menu-sections"].innerHTML = menuCategories.map((category) => {
    const illustration = category.illustration;
    let illustrationMarkup = "";
    if (illustration?.src && Number.isInteger(illustration.width) && Number.isInteger(illustration.height)) {
      const illustrationUrl = new URL(illustration.src, document.baseURI);
      if (menuAssetVersion) illustrationUrl.searchParams.set("v", menuAssetVersion);
      illustrationMarkup = `<img class="category-illustration" src="${escapeHtml(illustrationUrl.href)}" width="${illustration.width}" height="${illustration.height}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
    }
    const items = category.items.map((item) => {
      itemIndex.set(item.id, { item, category });
      return `<li><button class="menu-item" type="button" data-item-id="${escapeHtml(item.id)}" aria-controls="product-preview" aria-expanded="false"><span>${escapeHtml(item.name)}</span><span class="item-cue" aria-hidden="true">View</span></button></li>`;
    }).join("");
    return `<section class="menu-category" id="${escapeHtml(category.id)}" aria-labelledby="${escapeHtml(category.id)}-title"><div class="category-heading"><h2 id="${escapeHtml(category.id)}-title">${escapeHtml(category.name)}</h2>${illustrationMarkup}</div><ul class="item-grid">${items}</ul><p class="category-note">${escapeHtml(category.note)}</p></section>`;
  }).join("");
  el["selection-list"].innerHTML = selectionChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function setImage(image, placeholder, item) {
  image.hidden = true;
  placeholder.hidden = false;
  image.removeAttribute("src");
  image.alt = "";
  if (!item.photo) return;
  image.onload = () => { image.hidden = false; placeholder.hidden = true; };
  image.onerror = () => { image.hidden = true; placeholder.hidden = false; };
  image.alt = item.name;
  const url = new URL(item.photo, document.baseURI);
  if (menuAssetVersion) url.searchParams.set("v", menuAssetVersion);
  image.src = url.href;
}

function showProductPeek(button) {
  if (isCompactInteraction() || el["product-preview"].classList.contains("is-open")) return;
  const record = itemIndex.get(button.dataset.itemId);
  if (!record) return;
  peekButton = button;
  el["product-peek-name"].textContent = record.item.name;
  setImage(el["product-peek-image"], el["product-peek-placeholder"], record.item);
  const rect = button.getBoundingClientRect();
  const padding = 16;
  const width = Math.min(300, window.innerWidth - padding * 2);
  const height = el["product-peek"].offsetHeight;
  let left = rect.right + 16;
  if (left + width > window.innerWidth - padding) left = rect.left - width - 16;
  left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
  const top = Math.max(padding, Math.min(rect.top + rect.height / 2 - height / 2, window.innerHeight - height - padding));
  el["product-peek"].style.setProperty("--peek-left", `${left}px`);
  el["product-peek"].style.setProperty("--peek-top", `${top}px`);
  el["product-peek"].classList.add("is-visible");
}

function hideProductPeek(button = null) {
  if (button && peekButton !== button) return;
  el["product-peek"].classList.remove("is-visible");
  peekButton = null;
}

function renderProductOrdering(item) {
  editingLineId = null;
  const pricing = normalizedPricing(item);
  el["product-quantity"].value = "1";
  el["quote-servings"].value = "";
  el["quote-occasion"].value = "";
  el["quote-details"].value = "";
  el["product-order-note"].textContent = "";
  el["product-view-bag"].hidden = true;
  el["mix-builder"].hidden = true;
  el["mix-toggle"].checked = false;
  if (!pricing?.offers.length) {
    el["offer-fieldset"].hidden = true;
    el["quote-fields"].hidden = true;
    el["add-to-cart"].disabled = true;
    el["add-to-cart"].textContent = "Ordering option coming soon";
    el["product-order-note"].textContent = "Please use the contact form below for this item.";
    return;
  }
  const quote = pricing.mode === "quote";
  el["offer-fieldset"].hidden = quote && pricing.offers.length === 1;
  el["quote-fields"].hidden = !quote;
  el["add-to-cart"].disabled = false;
  el["add-to-cart"].textContent = quote ? "Add to quote request" : "Add to order bag";
  el["offer-options"].innerHTML = pricing.offers.map((offer, index) => {
    const savings = Number.isInteger(offer.compareAtCents) && Number.isInteger(offer.priceCents) ? Math.max(0, offer.compareAtCents - offer.priceCents) : 0;
    const price = Number.isInteger(offer.priceCents) ? formatMoney(offer.priceCents) : "Custom quote";
    return `<label class="offer-option"><input type="radio" name="offerId" value="${escapeHtml(offer.fullId)}" ${index ? "" : "checked"}><span><strong>${escapeHtml(offer.label)}</strong><small>${escapeHtml(price)}${savings ? ` · Save ${escapeHtml(formatMoney(savings))}` : ""}</small></span></label>`;
  }).join("");
  renderMixBuilder();
  updateProductNote();
}

function mixItemsFor(pricing) {
  const group = pricing?.mixGroup;
  if (!group) return [];
  return [...itemIndex.values()].filter(({ item }) => item.id !== "assorted-individual-tartlets" && normalizedPricing(item)?.mixGroup === group);
}

function selectedOffer() {
  if (!activeProduct) return null;
  const pricing = normalizedPricing(activeProduct);
  const id = el["product-order-form"].elements.offerId?.value || `${activeProduct.id}:quote`;
  return pricing?.offers.find((offer) => offer.fullId === id) || null;
}

function renderMixBuilder() {
  if (!activeProduct) return;
  const pricing = normalizedPricing(activeProduct);
  const offer = selectedOffer();
  const mixItems = mixItemsFor(pricing);
  const canMix = pricing?.mode === "builder" || (pricing?.mixGroup && offer?.units > 1 && mixItems.length > 1);
  el["mix-builder"].hidden = !canMix;
  if (!canMix) return;
  const alwaysBuild = pricing.mode === "builder";
  el["mix-toggle-label"].hidden = alwaysBuild;
  el["mix-toggle"].checked = alwaysBuild ? true : el["mix-toggle"].checked;
  el["mix-builder-fields"].hidden = !el["mix-toggle"].checked;
  const target = offer.units;
  const group = pricing.mixGroup;
  el["mix-builder-help"].textContent = group === "cookies"
    ? `Choose exactly ${target} cookies across 2–3 flavors, with at least 2 of each flavor.`
    : `Choose exactly ${target} items. The mixed-box price is calculated from the flavors selected.`;
  el["mix-components"].innerHTML = mixItems.map(({ item }) => `<label class="mix-component"><span>${escapeHtml(item.name)}</span><input type="number" min="0" max="${target}" step="1" value="${item.id === activeProduct.id && !alwaysBuild ? target : 0}" data-mix-product="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} quantity"></label>`).join("");
  updateMixTotal();
}

function mixSelection(validate = false) {
  if (el["mix-builder"].hidden || el["mix-builder-fields"].hidden) return null;
  const pricing = normalizedPricing(activeProduct);
  const offer = selectedOffer();
  const components = [...el["mix-components"].querySelectorAll("[data-mix-product]")]
    .map((input) => ({ productId: input.dataset.mixProduct, units: Math.max(0, parseInt(input.value, 10) || 0) }))
    .filter((component) => component.units > 0);
  const total = components.reduce((sum, component) => sum + component.units, 0);
  const cookieRulesFail = pricing.mixGroup === "cookies" && (components.length < 2 || components.length > 3 || components.some((component) => component.units < 2));
  if (validate && (total !== offer.units || cookieRulesFail)) {
    el["mix-total"].textContent = cookieRulesFail
      ? `Choose 2–3 flavors with at least 2 cookies each. Current total: ${total} of ${offer.units}.`
      : `Choose exactly ${offer.units} items. Current total: ${total}.`;
    el["mix-total"].classList.add("is-error");
    return false;
  }
  if (total !== offer.units) return { components, total, priceCents: null };
  const priceCents = priceComponents({ item: activeProduct, pricing, offer }, components);
  if (validate && !Number.isInteger(priceCents)) {
    el["mix-total"].textContent = "Please review the flavor selection before adding this box.";
    el["mix-total"].classList.add("is-error");
    return false;
  }
  return { components, total, priceCents };
}

function priceComponents(record, components) {
  const group = pricingCatalog?.mixGroups?.[record.pricing.mixGroup];
  if (!group || !Array.isArray(components) || !group.bundleQuantities.includes(record.offer.units)) return null;
  if (components.length < (group.minDistinctProducts || 1) || components.length > (group.maxDistinctProducts || 100)) return null;
  const seen = new Set();
  let units = 0;
  let raw = 0;
  for (const component of components) {
    if (!Number.isInteger(component.units) || component.units < (group.minUnitsPerProduct || 1) || seen.has(component.productId)) return null;
    seen.add(component.productId);
    if (record.pricing.componentIds && !record.pricing.componentIds.includes(component.productId)) return null;
    const item = itemIndex.get(component.productId)?.item;
    const pricing = item && normalizedPricing(item);
    if (pricing?.mode !== "fixed" || pricing.mixGroup !== record.pricing.mixGroup) return null;
    const offer = pricing.offers.find((candidate) => candidate.units === record.offer.units);
    if (!offer || !Number.isInteger(offer.priceCents)) return null;
    units += component.units;
    raw += (offer.priceCents * component.units) / record.offer.units;
  }
  if (units !== record.offer.units) return null;
  return Math.ceil((raw - Number.EPSILON) / group.roundUpToCents) * group.roundUpToCents;
}

function updateMixTotal() {
  if (el["mix-builder-fields"].hidden) return;
  const offer = selectedOffer();
  const result = mixSelection(false);
  el["mix-total"].classList.remove("is-error");
  el["mix-total"].textContent = result.total === offer.units
    ? `${result.total} of ${offer.units} selected${Number.isInteger(result.priceCents) ? ` · ${formatMoney(result.priceCents)}` : ""}`
    : `${result.total} of ${offer.units} selected`;
}

function updateProductNote() {
  if (!activeProduct) return;
  const pricing = normalizedPricing(activeProduct);
  const selected = el["product-order-form"].elements.offerId?.value || `${activeProduct.id}:quote`;
  const offer = pricing?.offers.find((candidate) => candidate.fullId === selected);
  if (!offer) return;
  const savings = Number.isInteger(offer.compareAtCents) && Number.isInteger(offer.priceCents) ? Math.max(0, offer.compareAtCents - offer.priceCents) : 0;
  const firstBundle = pricing.offers.find((candidate) => candidate.units > 1 && candidate.compareAtCents > candidate.priceCents);
  el["product-order-note"].textContent = savings
    ? `This option saves ${formatMoney(savings)} compared with individual pricing.`
    : pricing.mode === "quote"
      ? "Tell us what you need and we’ll confirm a custom price."
      : firstBundle
        ? `${firstBundle.label} pricing saves ${formatMoney(firstBundle.compareAtCents - firstBundle.priceCents)}.`
        : pricing.mode === "builder"
          ? "Starting price; the final assortment price depends on your flavor choices."
          : "Your total updates in the order bag.";
}

function activateItem(button, openOnClick = false) {
  const record = itemIndex.get(button.dataset.itemId);
  if (!record) return;
  if (activeButton && activeButton !== button) {
    activeButton.classList.remove("is-active");
    activeButton.setAttribute("aria-expanded", "false");
  }
  activeButton = button;
  activeProduct = record.item;
  button.classList.add("is-active");
  button.setAttribute("aria-expanded", "true");
  byId("preview-category").textContent = record.category.name;
  byId("preview-title").textContent = record.item.name;
  byId("preview-description").textContent = record.item.description;
  byId("preview-texture").textContent = record.item.texture;
  byId("preview-allergens").textContent = record.item.allergens;
  byId("preview-price").textContent = record.item.price;
  setImage(el["preview-image"], el["preview-placeholder"], record.item);
  renderProductOrdering(record.item);
  history.replaceState(null, "", `#product-${record.item.id}`);
  if (openOnClick) openPreview();
}

function openPreview() {
  openOverlay(el["product-preview"], previewClose, activeButton);
}

function closePreview() {
  closeOverlay(el["product-preview"]);
}

function setScrim(show) {
  el["mobile-scrim"].hidden = !show;
  document.body.classList.toggle("preview-open", show);
}

function openOverlay(panel, focusTarget, returnFocus = document.activeElement) {
  if (activeOverlay && activeOverlay !== panel) closeOverlay(activeOverlay, false);
  hideProductPeek();
  activeOverlay = panel;
  overlayReturnFocus = returnFocus;
  panel.scrollTop = 0;
  panel.classList.add("is-open");
  panel.inert = false;
  panel.setAttribute("aria-hidden", "false");
  setScrim(true);
  requestAnimationFrame(() => focusTarget?.focus());
}

function closeOverlay(panel = activeOverlay, returnFocus = true) {
  if (!panel) return;
  panel.classList.remove("is-open");
  panel.inert = true;
  panel.setAttribute("aria-hidden", "true");
  if (panel === el["product-preview"] && activeButton) activeButton.setAttribute("aria-expanded", "false");
  if (panel === el["cart-drawer"]) el["cart-toggle"].setAttribute("aria-expanded", "false");
  if (activeOverlay === panel) {
    activeOverlay = null;
    setScrim(false);
    const target = overlayReturnFocus;
    overlayReturnFocus = null;
    if (returnFocus && target?.isConnected) target.focus();
  }
  if (panel === el["product-preview"] && !isCompactInteraction() && location.hash.startsWith("#product-")) history.replaceState(null, "", `${location.pathname}${location.search}`);
}

function addActiveProduct() {
  renewCartActivity();
  const pricing = activeProduct && normalizedPricing(activeProduct);
  if (!pricing) return;
  const offerId = el["product-order-form"].elements.offerId?.value || `${activeProduct.id}:quote`;
  const offer = pricing.offers.find((candidate) => candidate.fullId === offerId);
  if (!offer) return;
  const mix = mixSelection(true);
  if (mix === false) return;
  const quantity = Math.max(1, Math.min(20, parseInt(el["product-quantity"].value, 10) || 1));
  const quote = pricing.mode === "quote" ? { servings: el["quote-servings"].value.trim(), occasion: el["quote-occasion"].value.trim(), details: el["quote-details"].value.trim() } : null;
  const components = mix?.components || null;
  if (editingLineId) cart = cart.filter((line) => line.lineId !== editingLineId);
  if (cart.length >= 50) { el["product-order-note"].textContent = "Please send us a message for an order with more than 50 selections."; return; }
  const existing = cart.find((line) => line.productId === activeProduct.id && line.offerId === offerId && JSON.stringify(line.quote) === JSON.stringify(quote) && JSON.stringify(line.components) === JSON.stringify(components));
  if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
  else cart.push({ lineId: editingLineId || createKey(), productId: activeProduct.id, offerId, quantity, quote, components });
  editingLineId = null;
  el["add-to-cart"].textContent = pricing.mode === "quote" ? "Add to quote request" : "Add to order bag";
  saveCart();
  renderCart();
  el["product-order-note"].textContent = `${activeProduct.name} added. Your bag has ${cartUnitCount()} item${cartUnitCount() === 1 ? "" : "s"}.`;
  el["product-view-bag"].hidden = false;
  el["cart-toggle"].classList.remove("cart-bump");
  requestAnimationFrame(() => el["cart-toggle"].classList.add("cart-bump"));
}

function cartUnitCount() {
  return cart.reduce((sum, line) => { const record = getRecord(line); return sum + (record ? (record.offer.units || 1) * line.quantity : 0); }, 0);
}

function linePriceCents(line, record) {
  return line.components ? priceComponents(record, line.components) : record.offer.priceCents;
}

function lineTitle(line, record) {
  if (!line.components) return record.item.name;
  const groupNames = { cookies: "Mixed cookies", "brownies-blondies": "Mixed brownies & blondies", muffins: "Mixed jumbo muffins", tartlets: "Assorted tartlets" };
  return `${groupNames[record.pricing.mixGroup] || "Mixed box"} — ${record.offer.units}-pack`;
}

function cartMediaItems(line, record) {
  if (!line.components) return [record.item];
  return line.components
    .map((component) => itemIndex.get(component.productId)?.item)
    .filter(Boolean)
    .slice(0, 3);
}

function cartThumbnail(item) {
  const initial = item.name.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() || "✦";
  let image = "";
  if (item.photo) {
    const url = new URL(item.photo, document.baseURI);
    if (menuAssetVersion) url.searchParams.set("v", menuAssetVersion);
    image = `<img class="cart-thumb-image" src="${escapeHtml(url.href)}" alt="" loading="lazy" />`;
  }
  return `<span class="cart-thumb${item.photo ? " has-photo" : ""}"><span class="cart-thumb-fallback" aria-hidden="true">${escapeHtml(initial)}</span>${image}</span>`;
}

function cartLineMedia(line, record) {
  const items = cartMediaItems(line, record);
  return `<span class="cart-line-media${items.length > 1 ? " is-mixed" : ""}" aria-hidden="true">${items.map(cartThumbnail).join("")}</span>`;
}

function componentText(line) {
  return line.components?.map((component) => `${component.units} × ${itemIndex.get(component.productId)?.item.name || component.productId}`).join(" · ") || "";
}

function lineSavings(line, record) {
  const price = linePriceCents(line, record);
  if (!Number.isInteger(price)) return 0;
  let compareAt = record.offer.compareAtCents;
  if (line.components) compareAt = line.components.reduce((sum, component) => {
    const item = itemIndex.get(component.productId)?.item;
    const single = item && normalizedPricing(item)?.offers.find((offer) => offer.units === 1);
    return sum + (single?.priceCents || 0) * component.units;
  }, 0);
  return Number.isInteger(compareAt) ? Math.max(0, compareAt - price) * line.quantity : 0;
}

function totals() {
  return cart.reduce((result, line) => {
    const record = getRecord(line);
    if (!record) return result;
    const price = linePriceCents(line, record);
    if (Number.isInteger(price)) result.subtotal += price * line.quantity;
    else result.hasQuote = true;
    result.savings += lineSavings(line, record);
    return result;
  }, { subtotal: 0, savings: 0, hasQuote: false });
}

function hasQuoteItem() {
  return cart.some((line) => getRecord(line)?.pricing.mode === "quote");
}

function localDateAfter(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function upgradeFor(line, record) {
  if (record.offer.units !== 1) return null;
  return record.pricing.offers
    .filter((offer) => offer.units > 1 && line.quantity % offer.units === 0 && Number.isInteger(offer.priceCents))
    .map((offer) => ({ offer, packs: line.quantity / offer.units, saving: record.offer.priceCents * line.quantity - offer.priceCents * (line.quantity / offer.units) }))
    .filter((choice) => choice.saving > 0).sort((a, b) => b.saving - a.saving)[0] || null;
}

function renderCart() {
  cart = cart.filter((line) => {
    const record = getRecord(line);
    return record && (!line.components || Number.isInteger(priceComponents(record, line.components))) && (record.pricing.mode !== "builder" || line.components);
  });
  const count = cartUnitCount();
  el["cart-count"].textContent = String(count);
  el["cart-toggle"].setAttribute("aria-label", `Open order bag, ${count} item${count === 1 ? "" : "s"}`);
  el["cart-count"].setAttribute("aria-label", `${count} item${count === 1 ? "" : "s"}`);
  el["cart-empty-message"].textContent = cartExpiredNotice ? EXPIRED_CART_MESSAGE : DEFAULT_EMPTY_CART_MESSAGE;
  el["cart-empty"].hidden = Boolean(cart.length);
  el["cart-content"].hidden = !cart.length;
  el["cart-items"].innerHTML = cart.map((line) => {
    const record = getRecord(line);
    const physicalUnits = (record.offer.units || 1) * line.quantity;
    const effectivePrice = linePriceCents(line, record);
    const price = Number.isInteger(effectivePrice) ? formatMoney(effectivePrice * line.quantity) : "Custom quote";
    const upgrade = upgradeFor(line, record);
    const mixedNames = componentText(line);
    const note = line.quote ? [line.quote.servings, line.quote.occasion, line.quote.details].filter(Boolean).join(" · ") : mixedNames || "";
    return `<li class="cart-line" data-line-id="${escapeHtml(line.lineId)}"><div class="cart-line-product">${cartLineMedia(line, record)}<div class="cart-line-copy"><div class="cart-line-heading"><div><strong>${escapeHtml(lineTitle(line, record))}</strong><span>${escapeHtml(record.offer.label)} · ${physicalUnits} item${physicalUnits === 1 ? "" : "s"}</span></div><strong>${escapeHtml(price)}</strong></div>${note ? `<p class="cart-line-note">${escapeHtml(note)}</p>` : ""}</div></div>${upgrade ? `<button class="saving-prompt" type="button" data-upgrade="${escapeHtml(upgrade.offer.fullId)}">Switch to ${escapeHtml(upgrade.offer.label)} and save ${escapeHtml(formatMoney(upgrade.saving))}</button>` : ""}<div class="cart-line-actions"><span class="stepper"><button type="button" data-action="decrease" aria-label="Decrease ${escapeHtml(record.item.name)} quantity">−</button><output aria-live="polite">${line.quantity}</output><button type="button" data-action="increase" aria-label="Increase ${escapeHtml(record.item.name)} quantity">+</button></span><button class="text-button" type="button" data-action="edit">Edit</button><button class="text-button" type="button" data-action="remove">Remove</button></div></li>`;
  }).join("");
  el["cart-items"].querySelectorAll(".cart-thumb-image").forEach((image) => {
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
    if (image.complete && !image.naturalWidth) image.hidden = true;
  });
  const sum = totals();
  el["cart-subtotal"].textContent = formatMoney(sum.subtotal);
  el["cart-savings"].textContent = sum.savings ? `−${formatMoney(sum.savings)}` : formatMoney(0);
  el["cart-quote-note"].hidden = !sum.hasQuote;
  el["checkout-start"].disabled = !cart.length;
}

function updateLine(id, action, upgradeId = null) {
  if (!renewCartActivity()) return;
  const index = cart.findIndex((line) => line.lineId === id);
  if (index < 0) return;
  if (action === "edit") { editCartLine(cart[index]); return; }
  if (action === "increase") cart[index].quantity = Math.min(20, cart[index].quantity + 1);
  if (action === "decrease" && --cart[index].quantity < 1) cart.splice(index, 1);
  if (action === "remove") cart.splice(index, 1);
  if (action === "upgrade" && cart[index]) {
    const record = getRecord(cart[index]);
    const offer = record?.pricing.offers.find((candidate) => candidate.fullId === upgradeId);
    if (offer) {
      const units = record.offer.units * cart[index].quantity;
      cart[index].offerId = upgradeId;
      cart[index].quantity = units / offer.units;
    }
  }
  saveCart();
  renderCart();
}

function editCartLine(line) {
  const button = document.querySelector(`[data-item-id="${CSS.escape(line.productId)}"]`);
  if (!button) return;
  activateItem(button, true);
  for (const input of el["offer-options"].querySelectorAll("input")) input.checked = input.value === line.offerId;
  el["product-quantity"].value = String(line.quantity);
  renderMixBuilder();
  if (line.components) {
    el["mix-toggle"].checked = true;
    renderMixBuilder();
    for (const input of el["mix-components"].querySelectorAll("input")) input.value = String(line.components.find((component) => component.productId === input.dataset.mixProduct)?.units || 0);
    updateMixTotal();
  }
  if (line.quote) {
    el["quote-servings"].value = line.quote.servings || "";
    el["quote-occasion"].value = line.quote.occasion || "";
    el["quote-details"].value = line.quote.details || "";
  }
  editingLineId = line.lineId;
  el["add-to-cart"].textContent = "Update order bag";
}

function renderReview() {
  const sum = totals();
  el["checkout-review-items"].innerHTML = `<ul class="checkout-review-list">${cart.map((line) => {
    const record = getRecord(line);
    const quantity = (record.offer.units || 1) * line.quantity;
    const effectivePrice = linePriceCents(line, record);
    const price = Number.isInteger(effectivePrice) ? formatMoney(effectivePrice * line.quantity) : "Custom quote";
    return `<li><span><strong>${escapeHtml(lineTitle(line, record))}</strong><small>${escapeHtml(record.offer.label)} · ${quantity} items</small>${line.components ? `<small>${escapeHtml(componentText(line))}</small>` : ""}</span><strong>${escapeHtml(price)}</strong></li>`;
  }).join("")}</ul>`;
  el["checkout-review-total"].innerHTML = sum.hasQuote ? `<span>Priced items estimate</span><strong>${formatMoney(sum.subtotal)} + custom quote</strong>` : `<span>Estimated subtotal</span><strong>${formatMoney(sum.subtotal)}</strong>`;
}

function showCheckoutStep(step) {
  const review = step === "review";
  el["checkout-review"].hidden = !review;
  el["order-form"].hidden = review;
  el["order-result"].hidden = true;
  el["checkout-kicker"].textContent = review ? "Step 1 of 2" : "Step 2 of 2";
  el["checkout-title"].textContent = review ? "Review your request" : "Contact & fulfillment";
  requestAnimationFrame(() => (review ? el["checkout-next"] : el["order-form"].elements.name).focus());
}

function openCheckout() {
  if (!renewCartActivity()) return;
  renderReview();
  const requestedDate = el["order-form"].elements.requestedDate;
  requestedDate.min = localDateAfter(hasQuoteItem() ? 7 : 3);
  el["order-lead-time"].textContent = hasQuoteItem() ? "Custom dessert requests need at least 7 days’ notice. Availability is confirmed after review." : "Please allow at least 3 days for your order. Availability is confirmed after review.";
  closeOverlay(el["cart-drawer"], false);
  showCheckoutStep("review");
  openOverlay(el["checkout-panel"], el["checkout-next"], el["cart-toggle"]);
}

function toggleDelivery() {
  const delivery = el["order-form"].elements.fulfillmentType.value === "delivery";
  el["delivery-address"].hidden = !delivery;
  for (const name of ["addressLine1", "city", "state", "postalCode"]) el["order-form"].elements[name].required = delivery;
}

function validateForm(form, summary) {
  summary.hidden = true;
  form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
  if (form.checkValidity()) return true;
  const invalid = [...form.querySelectorAll(":invalid")];
  invalid.forEach((field) => field.setAttribute("aria-invalid", "true"));
  summary.textContent = `Please review ${invalid.length} highlighted field${invalid.length === 1 ? "" : "s"}.`;
  summary.hidden = false;
  summary.focus();
  return false;
}

function quoteNotes() {
  return cart.map((line) => {
    const record = getRecord(line);
    if (!line.quote || !Object.values(line.quote).some(Boolean)) return null;
    return `${record.item.name}: ${[line.quote.servings && `Servings/size: ${line.quote.servings}`, line.quote.occasion && `Occasion: ${line.quote.occasion}`, line.quote.details && `Ideas: ${line.quote.details}`].filter(Boolean).join("; ")}`;
  }).filter(Boolean);
}

function orderPayload() {
  const form = new FormData(el["order-form"]);
  const type = form.get("fulfillmentType");
  const notes = [form.get("notes")?.trim(), ...quoteNotes()].filter(Boolean).join("\n\n");
  const payload = {
    schemaVersion: 1, requestType: "order", idempotencyKey: orderIdempotencyKey ||= createKey(),
    customer: { name: form.get("name").trim(), email: form.get("email").trim(), phone: form.get("phone").trim() },
    fulfillment: { type, requestedDate: form.get("requestedDate"), requestedWindow: form.get("requestedWindow").trim() },
    items: cart.map((line) => ({ offerId: line.offerId, quantity: line.quantity, ...(line.components ? { components: line.components } : {}) })),
    allergyAcknowledged: form.get("allergyAcknowledgement") === "on",
  };
  if (type === "delivery") payload.fulfillment.address = { line1: form.get("addressLine1").trim(), line2: form.get("addressLine2").trim() || undefined, city: form.get("city").trim(), state: form.get("state").trim(), postalCode: form.get("postalCode").trim() };
  if (notes) payload.notes = notes;
  if (turnstile.order.token) payload.turnstileToken = turnstile.order.token;
  return payload;
}

function orderSummary(payload) {
  const sum = totals();
  return ["Coco & Toffee order request", "", ...cart.map((line) => {
    const record = getRecord(line);
    const effectivePrice = linePriceCents(line, record);
    const price = Number.isInteger(effectivePrice) ? formatMoney(effectivePrice * line.quantity) : "Custom quote";
    return `- ${lineTitle(line, record)} — ${record.offer.label} × ${line.quantity}: ${price}${line.components ? `\n  Per box: ${componentText(line)}` : ""}`;
  }), "", sum.hasQuote ? `Priced items estimate: ${formatMoney(sum.subtotal)} + custom quote` : `Estimated subtotal: ${formatMoney(sum.subtotal)}`, `Name: ${payload.customer.name}`, `Email: ${payload.customer.email}`, payload.customer.phone && `Phone: ${payload.customer.phone}`, `Requested date: ${payload.fulfillment.requestedDate}`, `Fulfillment: ${payload.fulfillment.type}`, payload.fulfillment.requestedWindow && `Preferred time: ${payload.fulfillment.requestedWindow}`, payload.fulfillment.address && `Delivery address: ${Object.values(payload.fulfillment.address).filter(Boolean).join(", ")}`, payload.notes && `Notes: ${payload.notes}`, "This is a request, not a confirmed order. Payment through the approved secure link is required to confirm."].filter(Boolean).join("\n");
}

async function postJson(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Sending took too long. Please try again.");
    throw error;
  } finally { clearTimeout(timeout); }
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error?.message || "We couldn’t send your request right now.");
    Object.assign(error, { status: response.status, fields: data?.error?.fields, code: data?.error?.code });
    throw error;
  }
  return data;
}

function showOrderResult(submitted, data, message) {
  el["checkout-review"].hidden = true;
  el["order-form"].hidden = true;
  el["order-result"].hidden = false;
  el["checkout-kicker"].textContent = submitted ? "Request received" : "Copy required";
  el["checkout-title"].textContent = submitted ? "Thank you" : "One more step";
  el["order-result-title"].textContent = submitted ? "We received your request" : "Your request has not been sent";
  el["order-result-message"].textContent = message;
  el["order-summary-text"].textContent = lastOrderSummary;
  el["order-code"].hidden = !data?.publicCode;
  el["order-code"].textContent = data?.publicCode ? `Request number: ${data.publicCode}` : "";
  let checkout = null;
  try { const url = new URL(data?.checkoutUrl); if (url.protocol === "https:") checkout = url.href; } catch { checkout = null; }
  el["checkout-payment-link"].hidden = !checkout;
  if (checkout) el["checkout-payment-link"].href = checkout;
  el["order-email-link"].hidden = submitted;
  el["order-sms-link"].hidden = submitted;
  if (!submitted) el["order-sms-link"].href = smsHref(lastOrderSummary);
  if (submitted) { cart = []; saveCart(); renderCart(); orderIdempotencyKey = null; clearDraft("coco-order-draft-v1"); el["order-form"].reset(); toggleDelivery(); }
  requestAnimationFrame(() => el["copy-order"].focus());
}

async function submitOrder(event) {
  event.preventDefault();
  if (orderSubmitting) return;
  if (!validateForm(el["order-form"], el["order-error-summary"])) return;
  if (endpointFor("submit-order") && turnstileSiteKey() && !turnstile.order.token) {
    el["order-submit-status"].textContent = "Please complete the security check before sending.";
    return;
  }
  const payload = orderPayload();
  lastOrderSummary = orderSummary(payload);
  const endpoint = endpointFor("submit-order");
  orderSubmitting = true;
  el["order-submit"].disabled = true;
  el["order-submit"].textContent = "Sending…";
  el["order-submit-status"].textContent = "";
  el["order-copy-draft"].hidden = true;
  el["order-email-draft"].hidden = true;
  el["order-sms-draft"].hidden = true;
  if (!endpoint) {
    el["order-email-link"].href = `mailto:jericholi334677@gmail.com?subject=${encodeURIComponent("Coco & Toffee order request")}&body=${encodeURIComponent(lastOrderSummary)}`;
    showOrderResult(false, null, "Online sending is not connected yet. Copy the request details below and send them directly to Coco & Toffee.");
  } else {
    try {
      const data = await postJson(endpoint, payload);
      const message = data.status === "quote_requested" ? "We’ll review the custom items, confirm availability and email your quote. No payment has been collected." : data.status === "pending_payment" ? "Your request is approved. Use the secure payment link when you’re ready." : "We’ll review availability and email your final total and payment link. No payment has been collected.";
      showOrderResult(true, data, message);
      resetTurnstile("order");
    } catch (error) {
      el["order-submit-status"].textContent = error.status === 429 ? "Too many attempts. Please wait a moment, then try again." : error.status === 409 ? "The menu or availability changed. Please reopen your bag and review it." : `${error.message} Your selections are saved; you can retry or copy the order details.`;
      if (error.fields) for (const [name, message] of Object.entries(error.fields)) { const field = el["order-form"].elements[name]; if (field) { field.setAttribute("aria-invalid", "true"); field.title = message; } }
      resetTurnstile("order");
      el["order-copy-draft"].hidden = false;
      el["order-email-draft"].hidden = false;
      el["order-sms-draft"].hidden = false;
      el["order-email-draft"].href = `mailto:jericholi334677@gmail.com?subject=${encodeURIComponent("Coco & Toffee order request")}&body=${encodeURIComponent(lastOrderSummary)}`;
      el["order-sms-draft"].href = smsHref(lastOrderSummary);
    }
  }
  el["order-submit"].disabled = false;
  el["order-submit"].textContent = "Send order request";
  orderSubmitting = false;
}

async function copyText(text, status, success) {
  try { await navigator.clipboard.writeText(text); status.textContent = success; }
  catch { status.textContent = "Copy was unavailable. Please select and copy the details manually."; }
}

async function submitContact(event) {
  event.preventDefault();
  if (contactSubmitting) return;
  const form = el["contact-form"];
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const values = new FormData(form);
  const payload = { schemaVersion: 1, requestType: "contact", idempotencyKey: contactIdempotencyKey ||= createKey(), customer: { name: values.get("name").trim(), email: values.get("email").trim(), phone: values.get("phone").trim() }, subject: values.get("subject"), message: values.get("message").trim(), submittedAt: new Date().toISOString() };
  const contactMessage = `Coco & Toffee message\n\nName: ${payload.customer.name}\nEmail: ${payload.customer.email}\nPhone: ${payload.customer.phone}\nTopic: ${payload.subject}\n\n${payload.message}`;
  if (endpointFor("contact") && turnstileSiteKey() && !turnstile.contact.token) { el["contact-status"].textContent = "Please complete the security check before sending."; return; }
  if (turnstile.contact.token) payload.turnstileToken = turnstile.contact.token;
  const endpoint = endpointFor("contact");
  if (!endpoint) {
    el["contact-email-link"].href = `mailto:jericholi334677@gmail.com?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(`Name: ${payload.customer.name}\nEmail: ${payload.customer.email}\nPhone: ${payload.customer.phone}\n\n${payload.message}`)}`;
    el["contact-email-link"].hidden = false;
    el["contact-sms-link"].href = smsHref(contactMessage);
    el["contact-sms-link"].hidden = false;
    await copyText(contactMessage, el["contact-status"], "Online sending is not connected yet, so your message was copied. Paste it into your preferred email or message app.");
    return;
  }
  el["contact-submit"].disabled = true;
  el["contact-submit"].textContent = "Sending…";
  contactSubmitting = true;
  try { await postJson(endpoint, payload); form.reset(); clearDraft("coco-contact-draft-v1"); contactIdempotencyKey = null; el["contact-email-link"].hidden = true; el["contact-sms-link"].hidden = true; el["contact-status"].textContent = "Message received. We’ll reply using the email you provided."; resetTurnstile("contact"); }
  catch (error) {
    el["contact-status"].textContent = `${error.message} Your message is still here so you can retry or email it directly.`;
    el["contact-email-link"].href = `mailto:jericholi334677@gmail.com?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(`Name: ${payload.customer.name}\nEmail: ${payload.customer.email}\nPhone: ${payload.customer.phone}\n\n${payload.message}`)}`;
    el["contact-email-link"].hidden = false;
    el["contact-sms-link"].href = smsHref(contactMessage);
    el["contact-sms-link"].hidden = false;
    resetTurnstile("contact");
  }
  finally { el["contact-submit"].disabled = false; el["contact-submit"].textContent = "Send message"; contactSubmitting = false; }
}

function focusable(panel) {
  return [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((node) => !node.closest("[hidden]") && node.offsetParent !== null);
}

function attachInteractions() {
  document.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") showProductPeek(button); });
    button.addEventListener("pointerleave", () => hideProductPeek(button));
    button.addEventListener("focus", () => showProductPeek(button));
    button.addEventListener("blur", () => hideProductPeek(button));
    button.addEventListener("click", () => { hideProductPeek(); activateItem(button, true); });
  });
  el["product-order-form"].addEventListener("submit", (event) => { event.preventDefault(); addActiveProduct(); });
  el["offer-options"].addEventListener("change", () => { renderMixBuilder(); updateProductNote(); });
  el["mix-toggle"].addEventListener("change", () => {
    el["mix-builder-fields"].hidden = !el["mix-toggle"].checked;
    if (el["mix-toggle"].checked) renderMixBuilder();
  });
  el["mix-components"].addEventListener("input", updateMixTotal);
  el["product-quantity-minus"].addEventListener("click", () => el["product-quantity"].value = Math.max(1, (parseInt(el["product-quantity"].value, 10) || 1) - 1));
  el["product-quantity-plus"].addEventListener("click", () => el["product-quantity"].value = Math.min(20, (parseInt(el["product-quantity"].value, 10) || 1) + 1));
  previewClose.addEventListener("click", () => closeOverlay(el["product-preview"]));
  el["cart-toggle"].addEventListener("click", () => { renewCartActivity(); renderCart(); el["cart-toggle"].setAttribute("aria-expanded", "true"); openOverlay(el["cart-drawer"], el["cart-close"], el["cart-toggle"]); });
  el["product-view-bag"].addEventListener("click", () => el["cart-toggle"].click());
  for (const id of ["cart-close", "cart-browse", "cart-continue"]) el[id].addEventListener("click", () => closeOverlay(el["cart-drawer"]));
  el["cart-items"].addEventListener("click", (event) => { const line = event.target.closest(".cart-line"); if (!line) return; const action = event.target.closest("[data-action]")?.dataset.action; const upgrade = event.target.closest("[data-upgrade]")?.dataset.upgrade; if (action) updateLine(line.dataset.lineId, action); if (upgrade) updateLine(line.dataset.lineId, "upgrade", upgrade); });
  el["checkout-start"].addEventListener("click", openCheckout);
  el["checkout-close"].addEventListener("click", () => closeOverlay(el["checkout-panel"]));
  el["checkout-next"].addEventListener("click", () => showCheckoutStep("details"));
  el["checkout-back"].addEventListener("click", () => showCheckoutStep("review"));
  el["checkout-edit"].addEventListener("click", () => { renewCartActivity(); closeOverlay(el["checkout-panel"], false); el["cart-toggle"].setAttribute("aria-expanded", "true"); openOverlay(el["cart-drawer"], el["cart-close"], el["cart-toggle"]); });
  el["order-form"].addEventListener("change", (event) => { if (event.target.name === "fulfillmentType") toggleDelivery(); event.target.removeAttribute("aria-invalid"); orderIdempotencyKey = null; saveDraft(el["order-form"], "coco-order-draft-v1"); });
  el["order-form"].addEventListener("input", (event) => { event.target.removeAttribute("aria-invalid"); orderIdempotencyKey = null; saveDraft(el["order-form"], "coco-order-draft-v1"); });
  el["order-form"].addEventListener("submit", submitOrder);
  el["copy-order"].addEventListener("click", () => copyText(lastOrderSummary, el["copy-order-status"], "Order details copied."));
  el["order-copy-draft"].addEventListener("click", () => copyText(lastOrderSummary, el["order-submit-status"], "Order details copied."));
  el["order-result-close"].addEventListener("click", () => closeOverlay(el["checkout-panel"]));
  el["contact-form"].addEventListener("submit", submitContact);
  el["contact-form"].addEventListener("input", () => { contactIdempotencyKey = null; saveDraft(el["contact-form"], "coco-contact-draft-v1"); });
  el["contact-form"].addEventListener("change", () => { contactIdempotencyKey = null; saveDraft(el["contact-form"], "coco-contact-draft-v1"); });
  scrim.addEventListener("click", () => closePreview());
  scrim.addEventListener("click", () => { if (activeOverlay && activeOverlay !== el["product-preview"]) closeOverlay(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeOverlay) closeOverlay();
    if (event.key !== "Tab" || !activeOverlay) return;
    const nodes = focusable(activeOverlay); if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  });
  let compact = isCompactInteraction();
  window.addEventListener("resize", () => { hideProductPeek(); const next = isCompactInteraction(); if (next !== compact && activeOverlay === el["product-preview"]) closeOverlay(activeOverlay, false); compact = next; });
  window.addEventListener("scroll", () => hideProductPeek(), { passive: true });
}

async function copyChecklist() {
  const text = ["Coco & Toffee selection request", "", ...selectionChecklist.map((item) => `- ${item}: `)].join("\n");
  await copyText(text, el["copy-status"], "Checklist copied. Paste it into your message to Coco & Toffee.");
}

function restoreProductFromHash() {
  const id = location.hash.replace(/^#product-/, "");
  const button = itemIndex.has(id) && document.querySelector(`[data-item-id="${CSS.escape(id)}"]`);
  if (button) activateItem(button, !isCompactInteraction());
}

renderMenu();
for (const panel of [el["product-preview"], el["cart-drawer"], el["checkout-panel"]]) panel.inert = true;
renderCart();
attachInteractions();
restoreDraft(el["order-form"], "coco-order-draft-v1");
restoreDraft(el["contact-form"], "coco-contact-draft-v1");
toggleDelivery();
initTurnstile();
restoreProductFromHash();
el["copy-checklist"].addEventListener("click", copyChecklist);
