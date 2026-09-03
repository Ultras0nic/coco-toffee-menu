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

test("every product has the approved direct-customer price", () => {
  const prices = Object.fromEntries(
    menuCategories
      .flatMap((category) => category.items)
      .map((item) => [item.id, item.price]),
  );

  assert.deepEqual(prices, {
    "coco-double-chocolate": "$4.50 each · 6-pack $26 · dozen $51",
    "toffee-brown-butter-espresso": "$5 each · 6-pack $28.50 · dozen $57",
    "classic-chocolate-chip": "$4 each · 6-pack $23 · dozen $45",
    "cranberry-white-chocolate-oatmeal": "$4.50 each · 6-pack $26 · dozen $51",
    "white-chocolate-macadamia": "$5.50 each · 6-pack $32.50 · dozen $64.50",
    "smores-cookie": "$4.50 each · 6-pack $26 · dozen $51",
    "peanut-butter-blossom": "$5 each · 6-pack $29 · dozen $57",
    "classic-fudge-brownie": "$4.50 each · 4-pack $17 · dozen $51",
    "funfetti-blondie": "$4.50 each · 4-pack $17 · dozen $51",
    "chocolate-chip-jumbo-muffin": "$7.50 each · 6-pack $44",
    "blueberry-jumbo-muffin": "$7.50 each · 6-pack $44",
    "coffee-cake-jumbo-muffin": "$7.50 each · 6-pack $44",
    "jumbo-cinnamon-roll": "$10.50 each · 6-pack $62",
    "bacon-gruyere-onion-quiche": "$6.50 each · 6-pack $38 · dozen $76",
    "assorted-individual-tartlets": "4-count assortment from $30.50",
    "vanilla-custard-fresh-berry-tartlet": "$7.75 each · 4-pack $30.50",
    "lemon-cream-tartlet": "$11 each · 4-pack $43.50",
    "chocolate-hazelnut-tartlet": "$14.25 each · 4-pack $56",
    "classic-tiramisu": "Custom quote",
    "traditional-portuguese-flan": "Custom quote",
    chocoflan: "Custom quote",
    "new-york-style-cheesecake": "Custom quote",
    "four-layer-chocolate-cake": "Custom quote",
    "carrot-cake": "Custom quote",
    "classic-vanilla-cupcakes": "$6.50 each · 6-pack $37 · dozen $72",
    "pasteis-de-nata": "$6 each · 6-pack $35 · dozen $69",
  });
});

test("exactly the six whole desserts remain custom quotes", () => {
  const quoteOnlyIds = menuCategories
    .flatMap((category) => category.items)
    .filter((item) => item.price === "Custom quote")
    .map((item) => item.id)
    .sort();

  assert.deepEqual(quoteOnlyIds, [
    "carrot-cake",
    "chocoflan",
    "classic-tiramisu",
    "four-layer-chocolate-cake",
    "new-york-style-cheesecake",
    "traditional-portuguese-flan",
  ]);
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
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /Skip to menu/);
  assert.match(html, /Close product details/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
});

test("desktop product details open as a dismissible modal", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(
    css,
    /@media \(min-width: 821px\) and \(hover: hover\) and \(pointer: fine\)/,
  );
  assert.match(css, /\.product-preview\.is-open/);
  assert.match(css, /position: fixed/);
  assert.match(css, /visibility: hidden/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /font-size: clamp\(1\.55rem, 2\.1vw, 2rem\)/);
  assert.match(css, /\.preview-facts > div:last-child\s*{\s*order: -1/);
  assert.match(app, /if \(openOnClick\) openPreview\(\)/);
  assert.match(app, /scrim\.addEventListener\("click", \(\) => closePreview\(\)\)/);
  assert.match(app, /activeButton\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(app, /pointerenter/);
});

test("desktop hover preview contains only the product image and name", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /id="product-peek"[^>]*aria-hidden="true"/);
  assert.match(html, /id="product-peek-image"/);
  assert.match(html, /id="product-peek-name"/);
  assert.match(app, /function showProductPeek\(button\)/);
  assert.match(app, /button\.addEventListener\("pointerleave"/);
  assert.match(css, /\.product-peek\.is-visible/);
  assert.match(css, /pointer-events: none/);
  assert.match(css, /\.product-peek-photo\s*{\s*aspect-ratio: 16 \/ 9/);
});

test("the Cult UI-inspired lightboard sits between the menu header and category navigation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /<\/header>\s*<section class="slogan-lightboard"/);
  assert.doesNotMatch(html, /class="slogan-lightboard page-shell"/);
  assert.match(html, /<canvas id="slogan-lightboard" aria-hidden="true"><\/canvas>/);
  assert.match(html, /A little gift in every bite/);
  assert.match(app, /function initSloganLightboard\(\)/);
  assert.match(app, /new ResizeObserver/);
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(app, /const updateInterval = 70/);
  assert.match(app, /pointerenter/);
  assert.match(css, /\.slogan-lightboard canvas\s*{/);
  assert.match(css, /\.slogan-lightboard\s*{\s*width: 100%/);
  assert.match(css, /linear-gradient\(100deg, #321b14, #58311e 48%, #422117\)/);
  assert.doesNotMatch(css, /lightboard-glow/);
});

test("phone product details retain the bottom-sheet interaction", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /@media \(max-width: 820px\), \(hover: none\), \(pointer: coarse\)/);
  assert.match(css, /bottom: 0/);
  assert.match(css, /transform: translateY\(105%\)/);
});
