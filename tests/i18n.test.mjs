import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatUsd,
  normalizeLocale,
  overlayCatalog,
  resolveInitialLocale,
  shortLocale,
  translate,
} from "../i18n.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const menu = await readJson("../data/menu.json");
const categoryIds = menu.menuCategories.map(({ id }) => id).sort();
const productIds = menu.menuCategories.flatMap(({ items }) => items.map(({ id }) => id)).sort();

test("Portuguese, Spanish, and Chinese translations cover the current catalog exactly", async () => {
  for (const locale of ["pt-PT", "es-ES", "zh-Hans"]) {
    const overlay = await readJson(`../data/locales/${locale}.json`);
    assert.equal(overlay.locale, locale);
    assert.deepEqual(Object.keys(overlay.categories).sort(), categoryIds);
    assert.deepEqual(Object.keys(overlay.products).sort(), productIds);
    assert.equal(new Set(Object.values(overlay.products).map(({ name }) => name)).size, productIds.length);
    for (const category of Object.values(overlay.categories)) {
      assert.ok(category.name.trim());
      assert.ok(category.note.trim());
    }
    for (const product of Object.values(overlay.products)) {
      assert.deepEqual(Object.keys(product).sort(), ["allergens", "description", "name", "texture"]);
      for (const value of Object.values(product)) assert.ok(typeof value === "string" && value.trim());
    }
    assert.doesNotMatch(JSON.stringify(overlay), /priceCents|compareAtCents|offers|photo|mixGroup/);
  }
});

test("catalog overlays preserve authoritative commerce and media fields", async () => {
  const overlay = await readJson("../data/locales/zh-Hans.json");
  const localized = overlayCatalog(menu, overlay, "zh-Hans");
  const baseItem = menu.menuCategories[0].items[0];
  const localizedItem = localized.menuCategories[0].items[0];
  assert.notEqual(localizedItem.name, baseItem.name);
  assert.equal(localizedItem.englishAllergens, baseItem.allergens);
  assert.deepEqual(localizedItem.pricing, baseItem.pricing);
  assert.equal(localizedItem.photo, baseItem.photo);
  assert.deepEqual(localized.pricingCatalog, menu.pricingCatalog);
});

test("locale selection follows URL, storage, browser, and English fallback precedence", () => {
  assert.equal(resolveInitialLocale({ search: "?lang=zh", stored: "pt-PT", languages: ["es-ES"] }), "zh-Hans");
  assert.equal(resolveInitialLocale({ stored: "pt-PT", languages: ["es-ES"] }), "pt-PT");
  assert.equal(resolveInitialLocale({ languages: ["fr-FR", "es-MX"] }), "es-ES");
  assert.equal(resolveInitialLocale({ search: "?lang=invalid", languages: ["fr-FR"] }), "en");
  assert.equal(normalizeLocale("zh-CN"), "zh-Hans");
  assert.equal(shortLocale("es-ES"), "es");
});

test("USD formatting changes presentation but not integer-cent values", () => {
  const cents = 2875;
  assert.equal(formatUsd(cents, "en"), "$28.75");
  assert.match(formatUsd(cents, "pt-PT"), /28,75/);
  assert.match(formatUsd(cents, "es-ES"), /28,75/);
  assert.match(formatUsd(cents, "zh-Hans"), /28\.75/);
  assert.equal(cents, 2875);
});

test("the storefront location line is translated in every added language", () => {
  const source = "Local pickup and delivery, located in New Bedford. 02745.";
  for (const locale of ["pt-PT", "es-ES", "zh-Hans"]) {
    assert.notEqual(translate(locale, source), source);
  }
});

test("ZCOOL KuaiLe is loaded and scoped only to Chinese display text", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=ZCOOL\+KuaiLe&display=swap/);
  assert.match(html, /fonts\.gstatic\.com" crossorigin/);
  assert.match(css, /html\[data-locale="zh-Hans"\] \.menu-item,[^}]*font-family: "ZCOOL KuaiLe"/s);
  assert.doesNotMatch(css, /html\[data-locale="(?:en|pt-PT|es-ES)"\][^}]*ZCOOL KuaiLe/);
});

test("storefront sends the selected locale without trusting translated catalog values", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /schemaVersion: 2, requestType: "order", locale: currentLocale/);
  assert.match(app, /schemaVersion: 2, requestType: "contact", locale: currentLocale/);
  assert.match(app, /items: cart\.map\(\(line\) => \(\{ offerId: line\.offerId/);
  assert.doesNotMatch(app, /items: cart\.map[^\n]+name:/);
});
