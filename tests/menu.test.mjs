import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  contributionMarginBps,
  minimumSubtotalCents,
  priceBuilderBundle,
  priceFixedQuantity,
  priceMixedBundle,
  priceOfferCart,
  roundUpCents,
} from "../pricing/catalog.mjs";

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
    "toffee-brown-butter-espresso": "$5.25 each · 6-pack $28.75 · dozen $57",
    "classic-chocolate-chip": "$4.25 each · 6-pack $23 · dozen $45",
    "cranberry-white-chocolate-oatmeal": "$4.50 each · 6-pack $26 · dozen $51",
    "white-chocolate-macadamia": "$5.50 each · 6-pack $32.50 · dozen $64.50",
    "smores-cookie": "$4.50 each · 6-pack $26 · dozen $51",
    "peanut-butter-blossom": "$5 each · 6-pack $29 · dozen $57",
    "classic-fudge-brownie": "$4.50 each · 4-pack $17 · dozen $51",
    "funfetti-blondie": "$4.50 each · 4-pack $17 · dozen $51",
    "chocolate-chip-jumbo-muffin": "$7.50 each · 6-pack $44",
    "blueberry-jumbo-muffin": "$7.75 each · 6-pack $44.25",
    "coffee-cake-jumbo-muffin": "$7.75 each · 6-pack $44",
    "jumbo-cinnamon-roll": "$11 each · 6-pack $62.25",
    "bacon-gruyere-onion-quiche": "$7 each · 6-pack $38.25 · dozen $76",
    "assorted-individual-tartlets": "4-count assortment from $30.75",
    "vanilla-custard-fresh-berry-tartlet": "$8.25 each · 4-pack $30.75",
    "lemon-cream-tartlet": "$11.50 each · 4-pack $43.75",
    "chocolate-hazelnut-tartlet": "$14.50 each · 4-pack $56",
    "classic-tiramisu": "Custom quote",
    "traditional-portuguese-flan": "Custom quote",
    chocoflan: "Custom quote",
    "new-york-style-cheesecake": "Custom quote",
    "four-layer-chocolate-cake": "Custom quote",
    "carrot-cake": "Custom quote",
    "classic-vanilla-cupcakes": "$6.50 each · 6-pack $37 · dozen $72",
    "pasteis-de-nata": "$6.25 each · 6-pack $35 · dozen $69",
  });
});

test("every product exposes the approved structured pricing contract", () => {
  const compactPricing = Object.fromEntries(
    menuCategories.flatMap((category) =>
      category.items.map((item) => [
        item.id,
        {
          mode: item.pricing.mode,
          mixGroup: item.pricing.mixGroup ?? null,
          offers: item.pricing.offers.map((offer) => [
            offer.id,
            offer.label,
            offer.units,
            offer.priceCents,
            offer.compareAtCents,
          ]),
        },
      ]),
    ),
  );

  const fixed = (mixGroup, offers) => ({ mode: "fixed", mixGroup, offers });
  const quote = {
    mode: "quote",
    mixGroup: null,
    offers: [["quote", "Custom quote", null, null, null]],
  };

  assert.deepEqual(compactPricing, {
    "coco-double-chocolate": fixed("cookies", [
      ["each", "Each", 1, 450, null],
      ["pack-6", "6-pack", 6, 2600, 2700],
      ["dozen", "Dozen", 12, 5100, 5400],
    ]),
    "toffee-brown-butter-espresso": fixed("cookies", [
      ["each", "Each", 1, 525, null],
      ["pack-6", "6-pack", 6, 2875, 3150],
      ["dozen", "Dozen", 12, 5700, 6300],
    ]),
    "classic-chocolate-chip": fixed("cookies", [
      ["each", "Each", 1, 425, null],
      ["pack-6", "6-pack", 6, 2300, 2550],
      ["dozen", "Dozen", 12, 4500, 5100],
    ]),
    "cranberry-white-chocolate-oatmeal": fixed("cookies", [
      ["each", "Each", 1, 450, null],
      ["pack-6", "6-pack", 6, 2600, 2700],
      ["dozen", "Dozen", 12, 5100, 5400],
    ]),
    "white-chocolate-macadamia": fixed("cookies", [
      ["each", "Each", 1, 550, null],
      ["pack-6", "6-pack", 6, 3250, 3300],
      ["dozen", "Dozen", 12, 6450, 6600],
    ]),
    "smores-cookie": fixed("cookies", [
      ["each", "Each", 1, 450, null],
      ["pack-6", "6-pack", 6, 2600, 2700],
      ["dozen", "Dozen", 12, 5100, 5400],
    ]),
    "peanut-butter-blossom": fixed("cookies", [
      ["each", "Each", 1, 500, null],
      ["pack-6", "6-pack", 6, 2900, 3000],
      ["dozen", "Dozen", 12, 5700, 6000],
    ]),
    "classic-fudge-brownie": fixed("brownies-blondies", [
      ["each", "Each", 1, 450, null],
      ["pack-4", "4-pack", 4, 1700, 1800],
      ["dozen", "Dozen", 12, 5100, 5400],
    ]),
    "funfetti-blondie": fixed("brownies-blondies", [
      ["each", "Each", 1, 450, null],
      ["pack-4", "4-pack", 4, 1700, 1800],
      ["dozen", "Dozen", 12, 5100, 5400],
    ]),
    "chocolate-chip-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 750, null],
      ["pack-6", "6-pack", 6, 4400, 4500],
    ]),
    "blueberry-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 775, null],
      ["pack-6", "6-pack", 6, 4425, 4650],
    ]),
    "coffee-cake-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 775, null],
      ["pack-6", "6-pack", 6, 4400, 4650],
    ]),
    "jumbo-cinnamon-roll": fixed(null, [
      ["each", "Each", 1, 1100, null],
      ["pack-6", "6-pack", 6, 6225, 6600],
    ]),
    "bacon-gruyere-onion-quiche": fixed(null, [
      ["each", "Each", 1, 700, null],
      ["pack-6", "6-pack", 6, 3825, 4200],
      ["dozen", "Dozen", 12, 7600, 8400],
    ]),
    "assorted-individual-tartlets": {
      mode: "builder",
      mixGroup: "tartlets",
      offers: [["assorted-4", "4-count assortment", 4, 3075, null]],
    },
    "vanilla-custard-fresh-berry-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 825, null],
      ["pack-4", "4-pack", 4, 3075, 3300],
    ]),
    "lemon-cream-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 1150, null],
      ["pack-4", "4-pack", 4, 4375, 4600],
    ]),
    "chocolate-hazelnut-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 1450, null],
      ["pack-4", "4-pack", 4, 5600, 5800],
    ]),
    "classic-tiramisu": quote,
    "traditional-portuguese-flan": quote,
    chocoflan: quote,
    "new-york-style-cheesecake": quote,
    "four-layer-chocolate-cake": quote,
    "carrot-cake": quote,
    "classic-vanilla-cupcakes": fixed(null, [
      ["each", "Each", 1, 650, null],
      ["pack-6", "6-pack", 6, 3700, 3900],
      ["dozen", "Dozen", 12, 7200, 7800],
    ]),
    "pasteis-de-nata": fixed(null, [
      ["each", "Each", 1, 625, null],
      ["pack-6", "6-pack", 6, 3500, 3750],
      ["dozen", "Dozen", 12, 6900, 7500],
    ]),
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

test("the catalog encodes the approved exact-fill mix rules", () => {
  assert.deepEqual(menuData.pricingCatalog, {
    currency: "USD",
    discountStacking: "none",
    allowCrossGroupMixing: false,
    mixGroups: {
      cookies: {
        bundleQuantities: [6, 12],
        priceMethod: "weighted-offer-rate",
        roundUpToCents: 50,
        exactFill: true,
        bonusUnits: 0,
        minDistinctProducts: 2,
        maxDistinctProducts: 3,
        minUnitsPerProduct: 2,
      },
      "brownies-blondies": {
        bundleQuantities: [4, 12],
        priceMethod: "weighted-offer-rate",
        roundUpToCents: 50,
        exactFill: true,
      },
      muffins: {
        bundleQuantities: [6],
        priceMethod: "weighted-offer-rate",
        roundUpToCents: 25,
        exactFill: true,
      },
      tartlets: {
        bundleQuantities: [4],
        priceMethod: "weighted-offer-rate",
        roundUpToCents: 25,
        exactFill: true,
      },
    },
  });
});

test("margin formula protects a synthetic cost input after processing fees", () => {
  assert.equal(minimumSubtotalCents(1000), 1659);
  assert.ok(contributionMarginBps(1659, 1000) >= 3500);
  assert.ok(contributionMarginBps(1658, 1000) < 3500);
  assert.equal(roundUpCents(minimumSubtotalCents(1000), 25), 1675);
});

test("local private audit: every fixed offer protects the 35 percent introductory margin", async (t) => {
  const privatePath = process.env.COCO_PRIVATE_PRICING_FILE ||
    new URL("../../commerce-private-setup.json", import.meta.url);
  let privateSetup;
  try {
    privateSetup = JSON.parse(await readFile(privatePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      t.skip("Private cost inputs unavailable; set COCO_PRIVATE_PRICING_FILE to run the local margin audit.");
      return;
    }
    throw error;
  }
  const { fullCostCents } = privateSetup;
  assert.ok(fullCostCents && typeof fullCostCents === "object", "Private audit requires fullCostCents");
  const products = menuCategories.flatMap((category) => category.items);

  for (const item of products.filter(({ pricing }) => pricing.mode === "fixed")) {
    assert.ok(Number.isInteger(fullCostCents[item.id]), `Missing private cost input for ${item.id}`);
    for (const offer of item.pricing.offers) {
      const fullCost = fullCostCents[item.id] * offer.units;
      assert.ok(
        contributionMarginBps(offer.priceCents, fullCost) >= 3500,
        `${item.id}/${offer.id} falls below the 35% margin floor`,
      );
      assert.ok(
        offer.priceCents >= minimumSubtotalCents(fullCost),
        `${item.id}/${offer.id} is below its minimum safe subtotal`,
      );
    }
  }
});

test("mixed bundle prices use trusted flavor rates and approved rounding", () => {
  assert.equal(roundUpCents(2704.17, 50), 2750);
  assert.equal(roundUpCents(2600, 50), 2600);
  assert.equal(roundUpCents(4031.25, 25), 4050);

  assert.equal(
    priceMixedBundle(menuData, {
      mixGroup: "cookies",
      bundleUnits: 6,
      selections: [
        { productId: "classic-chocolate-chip", units: 2 },
        { productId: "toffee-brown-butter-espresso", units: 2 },
        { productId: "white-chocolate-macadamia", units: 2 },
      ],
    }),
    2850,
  );
  assert.equal(
    priceMixedBundle(menuData, {
      mixGroup: "cookies",
      bundleUnits: 12,
      selections: [
        { productId: "classic-chocolate-chip", units: 4 },
        { productId: "coco-double-chocolate", units: 4 },
        { productId: "white-chocolate-macadamia", units: 4 },
      ],
    }),
    5350,
  );
  assert.equal(
    priceMixedBundle(menuData, {
      mixGroup: "brownies-blondies",
      bundleUnits: 4,
      selections: [
        { productId: "classic-fudge-brownie", units: 2 },
        { productId: "funfetti-blondie", units: 2 },
      ],
    }),
    1700,
  );
  assert.equal(
    priceMixedBundle(menuData, {
      mixGroup: "muffins",
      bundleUnits: 6,
      selections: [
        { productId: "chocolate-chip-jumbo-muffin", units: 3 },
        { productId: "blueberry-jumbo-muffin", units: 3 },
      ],
    }),
    4425,
  );
  assert.equal(
    priceMixedBundle(menuData, {
      mixGroup: "tartlets",
      bundleUnits: 4,
      selections: [
        { productId: "vanilla-custard-fresh-berry-tartlet", units: 2 },
        { productId: "lemon-cream-tartlet", units: 1 },
        { productId: "chocolate-hazelnut-tartlet", units: 1 },
      ],
    }),
    4050,
  );
  assert.equal(
    priceBuilderBundle(menuData, {
      productId: "assorted-individual-tartlets",
      offerId: "assorted-4",
      priceCents: 1,
      selections: [
        { productId: "vanilla-custard-fresh-berry-tartlet", units: 2 },
        { productId: "lemon-cream-tartlet", units: 1 },
        { productId: "chocolate-hazelnut-tartlet", units: 1 },
      ],
    }),
    4050,
  );
});

test("invalid or cross-category mixes are rejected", () => {
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 13,
        selections: [{ productId: "classic-chocolate-chip", units: 13 }],
      }),
    /does not support/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [
          { productId: "classic-chocolate-chip", units: 3 },
          { productId: "coco-double-chocolate", units: 2 },
        ],
      }),
    /exactly 6 units/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [
          { productId: "classic-chocolate-chip", units: 4 },
          { productId: "classic-fudge-brownie", units: 2 },
        ],
      }),
    /not in cookies/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "tartlets",
        bundleUnits: 4,
        selections: [
          { productId: "assorted-individual-tartlets", units: 4 },
        ],
      }),
    /not in tartlets/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [
          { productId: "classic-chocolate-chip", units: 3 },
          { productId: "classic-chocolate-chip", units: 3 },
        ],
      }),
    /Duplicate selection/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [{ productId: "classic-chocolate-chip", units: 6 }],
      }),
    /at least 2 flavors/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [
          { productId: "classic-chocolate-chip", units: 2 },
          { productId: "coco-double-chocolate", units: 2 },
          { productId: "toffee-brown-butter-espresso", units: 1 },
          { productId: "white-chocolate-macadamia", units: 1 },
        ],
      }),
    /at most 3 flavors/,
  );
  assert.throws(
    () =>
      priceMixedBundle(menuData, {
        mixGroup: "cookies",
        bundleUnits: 6,
        selections: [
          { productId: "classic-chocolate-chip", units: 5 },
          { productId: "coco-double-chocolate", units: 1 },
        ],
      }),
    /at least 2 units per flavor/,
  );
  assert.throws(
    () =>
      priceBuilderBundle(menuData, {
        productId: "assorted-individual-tartlets",
        offerId: "assorted-4",
        selections: [
          { productId: "vanilla-custard-fresh-berry-tartlet", units: 3 },
          { productId: "classic-chocolate-chip", units: 1 },
        ],
      }),
    /not an allowed component/,
  );
});

test("cart totals resolve trusted catalog prices instead of submitted prices", () => {
  assert.equal(
    priceOfferCart(menuData, [
      {
        productId: "classic-chocolate-chip",
        offerId: "pack-6",
        count: 1,
        priceCents: 1,
      },
      {
        productId: "white-chocolate-macadamia",
        offerId: "each",
        count: 2,
        priceCents: 1,
      },
    ]),
    3400,
  );
  assert.deepEqual(priceFixedQuantity(menuData, "classic-chocolate-chip", 19), {
    subtotalCents: 7225,
    appliedOffers: [
      { offerId: "dozen", count: 1 },
      { offerId: "pack-6", count: 1 },
      { offerId: "each", count: 1 },
    ],
  });
  assert.throws(
    () => priceOfferCart(menuData, [{ productId: "chocoflan", offerId: "quote" }]),
    /does not have fixed-price offers/,
  );
});

test("private pricing inputs and quote guides are absent from public artifacts", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/202609030002_seed_catalog.sql", import.meta.url), "utf8",
  );
  assert.doesNotMatch(JSON.stringify(menuData), /startingAtCents|quoteGuides|fullCostCents|private_quote_start_cents/);
  assert.doesNotMatch(sql, /private_quote_start_cents|startingAtCents|quoteGuides|fullCostCents/);
  for (const path of [
    "../pricing/quote-pricing.seed.json",
    "../dist/pricing/quote-pricing.seed.json",
    "../dist/commerce-private-setup.json",
  ]) {
    await assert.rejects(access(new URL(path, import.meta.url)), { code: "ENOENT" });
  }
});

test("SQL catalog seed matches every public offer and pricing mode", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/202609030002_seed_catalog.sql", import.meta.url),
    "utf8",
  );
  const offerBlock = sql.match(
    /insert into public\.offers\([^]*?\) values([^]*?)on conflict \(id\)/,
  )?.[1];
  assert.ok(offerBlock, "SQL seed must contain explicit offer rows");
  const seededOffers = [...offerBlock.matchAll(
    /\('([^']+)', '([^']+)', '([^']+)', '([^']+)', (\d+), (\d+|null), (\d+)\)/g,
  )].map(([, id, productId, key, label, units, amount]) => ({
    id, productId, key, label, units: Number(units),
    priceCents: amount === "null" ? null : Number(amount),
  }));
  const backendKey = (offerId) => ({ each: "single", "pack-4": "4-pack", "pack-6": "6-pack" })[offerId] ?? offerId;
  const publicOffers = menuCategories.flatMap(({ items }) => items.flatMap((item) =>
    item.pricing.offers.map((offer) => ({
      id: `${item.id}:${backendKey(offer.id)}`,
      productId: item.id,
      key: backendKey(offer.id),
      label: offer.label,
      units: item.pricing.mode === "quote" ? 1 : offer.units,
      priceCents: offer.priceCents,
    })),
  ));
  assert.deepEqual(seededOffers, publicOffers);
  assert.equal(new Set(seededOffers.map(({ id }) => id)).size, seededOffers.length);

  const productBlock = sql.match(
    /insert into public\.products\([^]*?\) values([^]*?)on conflict \(id\)/,
  )?.[1];
  assert.ok(productBlock, "SQL seed must contain explicit product rows");
  const seededModes = Object.fromEntries([...productBlock.matchAll(
    /\('([^']+)', '(?:''|[^'])*', '(fixed|builder|quote)', \d+\)/g,
  )].map(([, id, mode]) => [id, mode]));
  assert.deepEqual(seededModes, Object.fromEntries(
    menuCategories.flatMap(({ items }) => items.map((item) => [item.id, item.pricing.mode])),
  ));

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
  assert.match(app, /activateItem\(button, true\)/);
  assert.match(app, /if \(open(?:OnClick)?\) (?:openPreview\(\)|openOverlay\()/);
  assert.match(app, /openOverlay\(el\["product-preview"\], previewClose, activeButton\)/);
  assert.match(app, /previewClose\.addEventListener\("click", \(\) => closeOverlay\(el\["product-preview"\]\)\)/);
  assert.match(app, /scrim\.addEventListener\("click",/);
  assert.match(app, /event\.key === "Escape" && activeOverlay\) closeOverlay\(\)/);
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

test("the warm slogan marquee sits between the menu header and category navigation", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /<\/header>\s*<section class="slogan-band"/);
  assert.match(html, /A little gift in every bite/);
  assert.match(html, /class="slogan-band-track" aria-hidden="true"/);
  assert.match(html, /class="slogan-band-group" aria-hidden="true"/);
  assert.doesNotMatch(html, /<canvas/);
  assert.doesNotMatch(app, /LightBoard|lightboardFont|initSloganLightboard/);
  assert.match(css, /\.slogan-band\s*{\s*width: 100%/);
  assert.match(css, /background-color: #decbb7/);
  assert.match(css, /animation: slogan-marquee 12s linear infinite/);
  assert.match(css, /\.slogan-band:hover \.slogan-band-track\s*{\s*animation-play-state: paused/);
  assert.match(css, /@keyframes slogan-marquee/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important/);
});

test("phone product details retain the bottom-sheet interaction", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /@media \(max-width: 820px\), \(hover: none\), \(pointer: coarse\)/);
  assert.match(css, /bottom: 0/);
  assert.match(css, /transform: translateY\(105%\)/);
});
