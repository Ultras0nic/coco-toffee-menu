import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("browser entry points parse successfully", () => {
  for (const file of ["app.js", "cart-storage.mjs", "i18n.mjs", "owner.js", "owner-config.js"]) {
    const result = spawnSync(process.execPath, ["--check", fileURLToPath(new URL(file, root))], { encoding: "utf8" });
    assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  }
});

test("the local preview serves browser modules with a JavaScript content type", async () => {
  const server = await readFile(new URL("scripts/dev.mjs", root), "utf8");
  assert.match(server, /"\.mjs": "text\/javascript; charset=utf-8"/);
});

test("public build is allow-listed and includes owner assets without server files", async () => {
  const build = await readFile(new URL("scripts/build.mjs", root), "utf8");
  for (const file of ["owner.html", "owner.css", "owner.js", "owner-config.js"]) assert.ok(build.includes(`"${file}"`));
  assert.doesNotMatch(build, /cp\(resolve\(root, "(?:supabase|pricing)"/);
  const config = await readFile(new URL("owner-config.js", root), "utf8");
  assert.doesNotMatch(config, /(?:sk_live_|sk_test_|sb_secret_|re_[A-Za-z0-9]{20})/);
  assert.match(config, /paymentsEnabled:\s*false/);
});

test("unconfigured storefront does not pretend requests were sent", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  assert.match(html, /meta name="order-endpoint" content="[^"]*"/);
  assert.match(html, /meta name="turnstile-site-key" content="[^"]*"/);
  assert.match(html, /meta name="payments-enabled" content="false"/);
  assert.match(app, /Your request has not been sent/);
  assert.match(app, /mailto:jericholi334677@gmail\.com/);
  assert.doesNotMatch(html, /Continue to secure payment/);
  assert.doesNotMatch(app, /final total and payment link/);
});

test("the redundant selection checklist is not rendered", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  for (const source of [html, app]) {
    assert.doesNotMatch(source, /selection-list|copy-checklist|copyChecklist/);
  }
  assert.doesNotMatch(css, /\.selection\s*\{/);
});

test("cart lines include product thumbnails with a graceful placeholder", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  assert.match(app, /function cartLineMedia/);
  assert.match(app, /class="cart-thumb-image"/);
  assert.match(app, /cart-thumb-fallback/);
  assert.match(css, /\.cart-line-product\s*\{/);
  assert.match(css, /\.cart-thumb-image\s*\{/);
});

test("phone fallback offers prefilled SMS for orders and questions", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  assert.match(html, /meta name="sms-recipient" content=""/);
  for (const id of ["order-sms-draft", "order-sms-link", "contact-sms-link"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function smsHref/);
  assert.match(app, /`sms:\$\{recipient\}\$\{separator\}body=/);
  assert.match(css, /\.sms-action:not\(\[hidden\]\)/);
});

test("contact submissions show persistent, prominent success feedback", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  assert.ok(html.indexOf('id="contact-status"') < html.indexOf('id="contact-submit"'));
  assert.match(html, /id="contact-status"[^>]+aria-atomic="true"/);
  assert.match(app, /Message sent! Thank you/);
  assert.match(app, /contact-submit"\]\.dataset\.sent = "true"/);
  assert.match(css, /\.contact-feedback\[data-state="success"\]/);
  assert.match(css, /#contact-submit\[data-sent="true"\]/);
});

test("private setup and secrets are not inside public content folders", async () => {
  const files = await readdir(new URL("data/", root));
  assert.deepEqual(files.sort(), ["locales", "menu.json"]);
  const localeFiles = await readdir(new URL("data/locales/", root));
  assert.deepEqual(localeFiles.sort(), ["es-ES.json", "pt-PT.json", "zh-Hans.json"]);
  const menu = await readFile(new URL("data/menu.json", root), "utf8");
  assert.doesNotMatch(menu, /PRIVATE_QUOTE_GUIDE|fullCostCents|private_quote_start|service_role|STRIPE_SECRET/);
});
