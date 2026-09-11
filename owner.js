const config = window.COCO_OWNER_CONFIG || {};
const OWNER_EMAIL = String(config.ownerEmail || "jericholi334677@gmail.com").trim().toLowerCase();
const PAYMENTS_ENABLED = config.paymentsEnabled === true;
const SESSION_KEY = "coco-owner-session";
const loginPanel = document.querySelector("#login-panel");
const inboxPanel = document.querySelector("#inbox-panel");
const loginForm = document.querySelector("#login-form");
const signOutButton = document.querySelector("#sign-out");
const statusNode = document.querySelector("#owner-status");
const loginStatus = document.querySelector("#login-status");
const ordersNode = document.querySelector("#orders");
const statusFilter = document.querySelector("#status-filter");
const statusFilterWrap = document.querySelector("#status-filter-wrap");
const inboxKind = document.querySelector("#inbox-kind");
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "") &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1$/i.test(config.functionsBaseUrl || "") &&
  !String(config.supabaseAnonKey || "").startsWith("YOUR_");
let session = readSession();
let privateQuoteGuide = {};

document.querySelector("#owner-email").value = OWNER_EMAIL;
document.querySelector("#setup-warning").hidden = configured;
loginForm.querySelector("button").disabled = !configured;

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100);
}

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

function saveSession(value) {
  session = value;
  if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else sessionStorage.removeItem(SESSION_KEY);
}

function captureMagicLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (accessToken) {
    const expiresIn = Number(params.get("expires_in") || 3600);
    saveSession({
      accessToken,
      refreshToken: params.get("refresh_token") || "",
      expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
    });
    history.replaceState({}, document.title, `${location.pathname}${location.search}`);
    return;
  }
  const error = params.get("error_description");
  if (error) {
    loginStatus.textContent = error;
    history.replaceState({}, document.title, `${location.pathname}${location.search}`);
  }
}

async function accessToken() {
  if (!session?.accessToken) return "";
  if (Number(session.expiresAt) > Date.now()) return session.accessToken;
  if (!session.refreshToken) { saveSession(null); return ""; }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: config.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) { saveSession(null); return ""; }
  saveSession({
    accessToken: result.access_token,
    refreshToken: result.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(result.expires_in || 3600) - 30) * 1000,
  });
  return session.accessToken;
}

async function api(path, options = {}) {
  const token = await accessToken();
  if (!token) throw new Error("Your sign-in link has expired. Please request a new one.");
  const response = await fetch(`${config.functionsBaseUrl}/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, apikey: config.supabaseAnonKey, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) await signOut(false);
  if (!response.ok) throw new Error(result.error?.message || `Request failed (${response.status})`);
  return result;
}

async function requestMagicLink() {
  const redirectTo = `${location.origin}${location.pathname}`;
  const response = await fetch(`${config.supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: { apikey: config.supabaseAnonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: OWNER_EMAIL, create_user: false }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.msg || result.error_description || "The sign-in email could not be sent");
}

async function signOut(callServer = true) {
  const token = session?.accessToken;
  saveSession(null);
  if (callServer && token && configured) {
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
      method: "POST", headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  loginPanel.hidden = false;
  inboxPanel.hidden = true;
  signOutButton.hidden = true;
}

function localMinimumDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function fulfillmentText(order) {
  const fulfillment = order.fulfillment || {};
  const address = fulfillment.address || {};
  const location = fulfillment.type === "delivery"
    ? [address.line1, address.line2, address.city, address.state, address.postalCode].filter(Boolean).join(", ")
    : "Pickup location is shared after approval";
  return `${fulfillment.type || "Not provided"} · requested ${fulfillment.requestedDate || "no date"} · ${fulfillment.requestedWindow ?? fulfillment.preferredTime ?? "flexible time"} · ${location}`;
}

function orderReplyHref(order) {
  const subject = `Re: Coco & Toffee order ${order.public_code}`;
  const body = `Hi ${order.customer_name},\n\nThank you for your Coco & Toffee order request ${order.public_code}.\n\n`;
  return `mailto:${encodeURIComponent(order.customer_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderOrder(order) {
  const lines = (order.order_items || []).map((item) => {
    const components = (item.order_item_components || []).map((component) =>
      `${escapeHtml(component.product_name)} × ${escapeHtml(component.total_units)}`).join(", ");
    return `<li><strong>${escapeHtml(item.product_name)}</strong> — ${escapeHtml(item.offer_label)} × ${escapeHtml(item.pack_quantity)}${item.line_total_cents == null ? " · quote" : ` · ${money(item.line_total_cents)}`}${components ? `<small>${components}</small>` : ""}</li>`;
  }).join("");
  const failedNotifications = (order.notification_outbox || []).filter((item) => item.status === "failed");
  const canReview = ["quote_requested", "pending_approval", "changes_requested", "payment_setup_pending", "payment_failed", "payment_expired"].includes(order.status);
  const canCreatePayment = canReview && PAYMENTS_ENABLED;
  const hasQuote = (order.order_items || []).some((item) => item.amount_cents == null);
  const activePaymentLink = PAYMENTS_ENABLED && order.status === "pending_payment" && order.checkout_url &&
    order.checkout_expires_at && new Date(order.checkout_expires_at).getTime() > Date.now();
  const quoteGuideMinimum = Number(order.subtotal_cents || 0) + (order.order_items || [])
    .filter((item) => item.amount_cents == null)
    .reduce((sum, item) => sum + Number(privateQuoteGuide[item.product_id] || 0) * Number(item.pack_quantity || 1), 0);
  const leadDays = hasQuote ? 7 : 3;
  const requestedDate = order.fulfillment?.requestedDate || "";
  const approvedDate = order.approved_date || (requestedDate >= localMinimumDate(leadDays) ? requestedDate : localMinimumDate(leadDays));
  const quoteValue = Number(order.quoted_total_cents || quoteGuideMinimum) / 100;
  return `<article class="order-card" data-order-id="${escapeHtml(order.id)}">
    <div class="order-heading"><h2>Order ${escapeHtml(order.public_code)}</h2><span class="status-pill">${escapeHtml(String(order.status).replaceAll("_", " "))}</span></div>
    <div class="order-meta">
      <span><strong>Customer:</strong> ${escapeHtml(order.customer_name)}</span>
      <span><strong>Email:</strong> <a href="mailto:${escapeHtml(order.customer_email)}">${escapeHtml(order.customer_email)}</a></span>
      <span><strong>Phone:</strong> ${escapeHtml(order.customer_phone || "Not provided")}</span>
      <span><strong>Customer language:</strong> ${escapeHtml(order.customer_locale || "en")}</span>
      <span><strong>Received:</strong> ${escapeHtml(new Date(order.created_at).toLocaleString())}</span>
      <span><strong>Fixed-item subtotal:</strong> ${money(order.subtotal_cents)}</span>
      <span><strong>Current total:</strong> ${money(order.total_cents)}</span>
    </div>
    <ul class="line-items">${lines}</ul>
    <p><strong>Fulfillment:</strong> ${escapeHtml(fulfillmentText(order))}</p>
    ${order.approved_date ? `<p data-approved-schedule><strong>Approved fulfillment:</strong> ${escapeHtml(order.approved_date)} · ${escapeHtml(order.approved_window || "Time to be arranged")}</p>` : ""}
    <p><strong>Customer notes:</strong> ${escapeHtml(order.notes || "None")}</p>
    ${order.owner_note ? `<p><strong>Owner message:</strong> ${escapeHtml(order.owner_note)}</p>` : ""}
    ${PAYMENTS_ENABLED && order.checkout_expires_at ? `<p><strong>Payment link expires:</strong> ${escapeHtml(new Date(order.checkout_expires_at).toLocaleString())}</p>` : ""}
    ${failedNotifications.length ? `<p class="notice-error">${failedNotifications.length} email notification(s) need retry.</p>` : ""}
    ${canReview ? `<div class="approval-grid">
      ${canCreatePayment && hasQuote ? `<label>Approved food total ($)<input data-role="quote-total" type="number" min="${(quoteGuideMinimum / 100).toFixed(2)}" step="0.01" value="${quoteValue.toFixed(2)}" required /><small>Private starting guide plus fixed items: ${money(quoteGuideMinimum)}</small></label>` : ""}
      ${canCreatePayment ? `<label>Approved date<input data-role="approved-date" type="date" min="${localMinimumDate(leadDays)}" value="${escapeHtml(approvedDate)}" required /></label>
      <label>Pickup/delivery time<input data-role="approved-window" type="text" maxlength="120" value="${escapeHtml(order.approved_window || order.fulfillment?.requestedWindow || order.fulfillment?.preferredTime || "")}" placeholder="Example: 10:00–11:00 AM" required /></label>
      <label>Delivery fee ($)<input data-role="delivery" type="number" min="0" max="10000" step="0.01" value="${(Number(order.delivery_cents || 0) / 100).toFixed(2)}" /></label>
      <label>Tax ($)<input data-role="tax" type="number" min="0" max="10000" step="0.01" value="${(Number(order.tax_cents || 0) / 100).toFixed(2)}" /></label>` : ""}
      <label class="full-field">Message to customer<textarea data-role="owner-note" maxlength="2000" rows="3" placeholder="Required when requesting changes or declining">${escapeHtml(order.owner_note || "")}</textarea></label>
    </div>` : ""}
    <div class="actions">
      <a class="button-link" href="${escapeHtml(orderReplyHref(order))}">Reply by email</a>
      ${canCreatePayment ? `<button data-action="approve">Approve &amp; create payment link</button>` : ""}
      ${canReview ? `<button class="secondary" data-action="request_changes">Request changes</button><button class="danger" data-action="decline">Decline</button>` : ""}
      ${order.status === "confirmed" ? `<button data-action="fulfill">Mark fulfilled</button>` : ""}
      ${activePaymentLink ? `<a class="button-link" href="${escapeHtml(order.checkout_url)}" target="_blank" rel="noopener">Open payment link</a><button class="secondary" data-action="copy_email">Copy customer email</button>` : ""}
    </div>
  </article>`;
}

function renderContact(message) {
  return `<article class="order-card" data-message-id="${escapeHtml(message.id)}">
    <div class="order-heading"><h2>Inquiry ${escapeHtml(message.public_code)}</h2><span class="status-pill">${escapeHtml(message.status)}</span></div>
    <div class="order-meta"><span><strong>From:</strong> ${escapeHtml(message.customer_name)}</span><span><strong>Email:</strong> <a href="mailto:${escapeHtml(message.customer_email)}">${escapeHtml(message.customer_email)}</a></span><span><strong>Phone:</strong> ${escapeHtml(message.customer_phone || "Not provided")}</span><span><strong>Customer language:</strong> ${escapeHtml(message.customer_locale || "en")}</span><span><strong>Received:</strong> ${escapeHtml(new Date(message.created_at).toLocaleString())}</span></div>
    <p><strong>Topic:</strong> ${escapeHtml(message.subject || "General question")}</p><p class="message-body">${escapeHtml(message.message)}</p>
    <div class="actions"><a class="button-link" href="mailto:${escapeHtml(message.customer_email)}?subject=${encodeURIComponent(`Re: Coco & Toffee inquiry ${message.public_code}`)}">Reply by email</a><button data-contact-status="reviewed">Mark reviewed</button><button class="secondary" data-contact-status="closed">Close</button><button class="danger" data-contact-status="spam">Spam</button></div>
  </article>`;
}

async function loadInbox() {
  statusNode.textContent = "Loading…";
  const contacts = inboxKind.value === "contacts";
  statusFilterWrap.hidden = contacts;
  const query = contacts ? "?kind=contacts" : statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : "";
  const result = await api(`owner-orders${query}`);
  if (contacts) {
    ordersNode.innerHTML = result.contacts.length ? result.contacts.map(renderContact).join("") : `<p class="muted">No questions found.</p>`;
    statusNode.textContent = `${result.contacts.length} question(s) loaded.`;
  } else {
    privateQuoteGuide = result.privateQuoteGuide || {};
    ordersNode.innerHTML = result.orders.length ? result.orders.map(renderOrder).join("") : `<p class="muted">No order requests found.</p>`;
    statusNode.textContent = `${result.orders.length} order request(s) loaded.`;
  }
}

function centsFrom(card, role) {
  const value = Number(card.querySelector(`[data-role="${role}"]`)?.value || 0);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

function manualCustomerEmail(orderCard) {
  const reference = orderCard.querySelector("h2")?.textContent || "Coco & Toffee order";
  const link = orderCard.querySelector('a[href^="https://checkout.stripe.com/"]')?.href || "";
  const total = [...orderCard.querySelectorAll(".order-meta span")].find((node) => node.textContent.includes("Current total"))?.textContent || "";
  const schedule = orderCard.querySelector("[data-approved-schedule]")?.textContent?.trim() || "Approved fulfillment time is shown in your order email.";
  return `${reference}\n\nYour order request has been reviewed.\n${schedule}\n${total}\n\nPay securely within 24 hours:\n${link}\n\nYour order is not confirmed until Coco & Toffee approves it and payment is completed. An unpaid or expired link does not reserve the production date.\n\nPaid cancellations receive a full refund when requested at least 72 hours before regular-item fulfillment or 7 days before custom-dessert fulfillment. Later cancellations are non-refundable unless Coco & Toffee cancels.`;
}

async function ownerAction(button) {
  const card = button.closest("[data-order-id]");
  const action = button.dataset.action;
  if (action === "copy_email") {
    await navigator.clipboard.writeText(manualCustomerEmail(card));
    statusNode.textContent = "Customer payment email copied. Paste it into Gmail and review before sending.";
    return;
  }
  const body = { orderId: card.dataset.orderId, action };
  if (["approve", "request_changes", "decline"].includes(action)) {
    body.ownerNote = card.querySelector('[data-role="owner-note"]')?.value || "";
  }
  if (action === "approve") {
    body.approvedDate = card.querySelector('[data-role="approved-date"]')?.value || "";
    body.approvedWindow = card.querySelector('[data-role="approved-window"]')?.value || "";
    body.deliveryCents = centsFrom(card, "delivery");
    body.taxCents = centsFrom(card, "tax");
    const quoteInput = card.querySelector('[data-role="quote-total"]');
    if (quoteInput) body.quotedTotalCents = centsFrom(card, "quote-total");
  }
  button.disabled = true;
  try {
    await api("owner-orders", { method: "PATCH", body: JSON.stringify(body) });
    await loadInbox();
  } catch (error) {
    statusNode.textContent = error.message;
    button.disabled = false;
  }
}

async function contactAction(button) {
  button.disabled = true;
  try {
    await api("owner-orders", { method: "PATCH", body: JSON.stringify({
      action: "review_contact", messageId: button.closest("[data-message-id]").dataset.messageId, status: button.dataset.contactStatus,
    }) });
    await loadInbox();
  } catch (error) { statusNode.textContent = error.message; button.disabled = false; }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  loginStatus.textContent = "Requesting your secure sign-in link…";
  try {
    await requestMagicLink();
    loginStatus.textContent = `A one-time sign-in link was sent to ${OWNER_EMAIL}. Open it in this browser.`;
  } catch (error) { loginStatus.textContent = error.message; }
  finally { button.disabled = !configured; }
});

ordersNode.addEventListener("click", (event) => {
  const orderButton = event.target.closest("button[data-action]");
  const contactButton = event.target.closest("button[data-contact-status]");
  if (orderButton) ownerAction(orderButton);
  if (contactButton) contactAction(contactButton);
});
document.querySelector("#refresh-orders").addEventListener("click", loadInbox);
document.querySelector("#retry-notifications").addEventListener("click", async () => {
  try { const result = await api("process-notifications", { method: "POST", body: "{}" }); statusNode.textContent = `${result.sent} email(s) sent; ${result.suppressed || 0} customer email(s) held until a sending domain is ready; ${result.failed} will retry automatically.`; await loadInbox(); }
  catch (error) { statusNode.textContent = error.message; }
});
statusFilter.addEventListener("change", loadInbox);
inboxKind.addEventListener("change", loadInbox);
signOutButton.addEventListener("click", () => signOut());

captureMagicLink();
if (session && configured) {
  loginPanel.hidden = true;
  inboxPanel.hidden = false;
  signOutButton.hidden = false;
  loadInbox().catch(async (error) => { await signOut(false); loginStatus.textContent = error.message; });
}
