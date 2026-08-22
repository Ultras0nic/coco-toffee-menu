import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const menuData = JSON.parse(
  await readFile(new URL("../data/menu.json", import.meta.url), "utf8"),
);
const { menuCategories, selectionChecklist } = menuData;

test("the final PDF menu structure is represented", () => {
  assert.equal(menuCategories.length, 8);
  assert.equal(menuCategories.flatMap((category) => category.items).length, 48);
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
