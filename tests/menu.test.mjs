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

test("the recipe collection menu structure is represented", () => {
  assert.equal(menuCategories.length, 8);
  assert.equal(menuCategories.flatMap((category) => category.items).length, 26);
  assert.deepEqual(
    menuCategories.map((category) => category.name),
    [
      "Cookies",
      "Brownies & Blondies",
      "Muffins & Cinnamon Rolls",
      "Savory Baking",
      "Tartlets",
      "Tiramisu & Flans",
      "Cakes & Cupcakes",
      "Portuguese Pastries",
    ],
  );
});

test("the supplied product photos are assigned to the requested products", () => {
  const items = new Map(
    menuCategories
      .flatMap((category) => category.items)
      .map((item) => [item.id, item.photo]),
  );

  assert.deepEqual(
    Object.fromEntries(
      [
        "coco-double-chocolate",
        "toffee-brown-butter-espresso",
        "cranberry-white-chocolate-oatmeal",
        "classic-chocolate-chip",
        "jumbo-cinnamon-roll",
      ].map((id) => [id, items.get(id)]),
    ),
    {
      "coco-double-chocolate": "assets/menu/coco-double-chocolate.jpg?v=2026-09-01-1",
      "toffee-brown-butter-espresso": "assets/menu/toffee-brown-butter-espresso.jpg?v=2026-09-01-1",
      "cranberry-white-chocolate-oatmeal": "assets/menu/cranberry-white-chocolate-oatmeal.jpg?v=2026-09-01-1",
      "classic-chocolate-chip": "assets/menu/classic-chocolate-chip-cookie.jpg?v=2026-09-01-1",
      "jumbo-cinnamon-roll": "assets/menu/jumbo-cinnamon-roll.jpg?v=2026-09-01-1",
    },
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
