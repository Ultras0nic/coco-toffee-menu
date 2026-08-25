import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const menuData = JSON.parse(
  await readFile(new URL("../data/menu.json", import.meta.url), "utf8"),
);
const { menuCategories, selectionChecklist } = menuData;

test("photo replacements have an explicit cache version", () => {
  assert.match(menuData.assetVersion, /^\d{4}-\d{2}-\d{2}-\d+$/);
});

test("the final PDF menu structure is represented", () => {
  assert.equal(menuCategories.length, 8);
  assert.ok(
    menuCategories.flatMap((category) => category.items).length >= 48,
    "The menu must retain at least the 48-item baseline",
  );
  assert.deepEqual(
    menuCategories.map((category) => category.name),
    [
      "Cookies",
      "Bars & Brownies",
      "Muffins",
      "Sweet Yeasted Breads",
      "Little Treats",
      "Savory",
      "Cakes & Large Desserts",
      "Individual Refrigerated Desserts",
    ],
  );
});

test("every item is editable and has a unique stable id", () => {
  const items = menuCategories.flatMap((category) => category.items);
  const ids = new Set();
  for (const item of items) {
    assert.ok(item.id);
    assert.ok(item.name);
    assert.ok(item.description);
    assert.ok(item.texture);
    assert.ok(item.allergens);
    assert.ok(item.price);
    assert.equal(typeof item.photo, "string");
    assert.equal(ids.has(item.id), false, `Duplicate item id: ${item.id}`);
    ids.add(item.id);
  }
});

test("the repository JSON is the webpage content source", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /\.\/data\/menu\.json/);
  assert.doesNotMatch(app, /menu-data\.js/);
});

test("every configured product photo points to a published asset", async () => {
  const items = menuCategories.flatMap((category) => category.items);
  for (const item of items.filter((candidate) => candidate.photo)) {
    const photoUrl = new URL(item.photo, "https://example.test/");
    assert.match(photoUrl.pathname, /^\/assets\/menu\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/i);
    assert.equal(photoUrl.searchParams.get("v"), menuData.assetVersion);
    await access(new URL(`..${photoUrl.pathname}`, import.meta.url));
  }
});

test("ordering checklist preserves all requested fields", () => {
  assert.equal(selectionChecklist.length, 6);
});

test("page includes key accessible interaction surfaces", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Skip to menu/);
  assert.match(html, /Close product details/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
});
