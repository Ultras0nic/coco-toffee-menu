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
  assert.equal(menuCategories.flatMap((category) => category.items).length, 29);
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

test("every category has one unique optimized transparent illustration", async () => {
  const expected = {
    cookies: { src: "assets/categories/category-cookies.webp", width: 640, height: 329 },
    "brownies-blondies": { src: "assets/categories/category-brownies-blondies.webp", width: 640, height: 510 },
    "muffins-cinnamon-rolls": { src: "assets/categories/category-muffins-cinnamon-rolls.webp", width: 640, height: 591 },
    "savory-baking": { src: "assets/categories/category-savory-baking.webp", width: 640, height: 479 },
    tartlets: { src: "assets/categories/category-tartlets.webp", width: 640, height: 514 },
    "tiramisu-flans": { src: "assets/categories/category-tiramisu-flans.webp", width: 640, height: 500 },
    "cakes-cupcakes": { src: "assets/categories/category-cakes-cupcakes.webp", width: 640, height: 452 },
    "portuguese-pastries": { src: "assets/categories/category-portuguese-pastries.webp", width: 640, height: 469 },
  };

  assert.deepEqual(
    Object.fromEntries(menuCategories.map(({ id, illustration }) => [id, illustration])),
    expected,
  );
  assert.equal(new Set(menuCategories.map(({ illustration }) => illustration.src)).size, 8);

  for (const { illustration } of menuCategories) {
    const assetUrl = new URL(`../${illustration.src}`, import.meta.url);
    await access(assetUrl);
    const asset = await readFile(assetUrl);
    assert.ok(asset.byteLength <= 120 * 1024, `${illustration.src} exceeds 120KB`);
    assert.equal(asset.toString("ascii", 0, 4), "RIFF");
    assert.equal(asset.toString("ascii", 8, 12), "WEBP");
    assert.ok(asset.includes(Buffer.from("ALPH")), `${illustration.src} has no alpha channel`);
  }
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
    "coco-double-chocolate": "$3.50 each · 6-pack $20 · dozen $39",
    "toffee-brown-butter-espresso": "$3.50 each · 6-pack $20 · dozen $39",
    "classic-chocolate-chip": "$3.50 each · 6-pack $20 · dozen $39",
    "cranberry-white-chocolate-oatmeal": "$3.50 each · 6-pack $20 · dozen $39",
    "white-chocolate-macadamia": "$3.75 each · 6-pack $21.25 · dozen $41.75",
    "smores-cookie": "$3.50 each · 6-pack $20 · dozen $39",
    "peanut-butter-blossom": "$3.50 each · 6-pack $20 · dozen $39",
    "classic-fudge-brownie": "$3 each · 4-pack $11.50 · dozen $33.50",
    "funfetti-blondie": "$3 each · 4-pack $11.50 · dozen $33.50",
    "chocolate-chip-jumbo-muffin": "$3 each · 6-pack $17",
    "blueberry-jumbo-muffin": "$3 each · 6-pack $17",
    "coffee-cake-jumbo-muffin": "$3 each · 6-pack $17",
    "jumbo-cinnamon-roll": "$4.50 each · 6-pack $25.75",
    "bacon-gruyere-onion-quiche": "$4 each · 6-pack $22.75 · dozen $44.75",
    "assorted-individual-tartlets": "4-count assortment from $26.50",
    "vanilla-custard-fresh-berry-tartlet": "$7 each · 4-pack $26.50",
    "lemon-cream-tartlet": "$7 each · 4-pack $26.50",
    "chocolate-hazelnut-tartlet": "$7 each · 4-pack $26.50",
    "classic-tiramisu": "$7 per slice",
    "traditional-portuguese-flan": "$4.50 per slice · whole flan $20",
    chocoflan: "$5 per slice · whole dessert $25",
    "new-york-style-cheesecake":
      "$50 per whole 9-inch cheesecake · flavors and finishes on request",
    "four-layer-chocolate-cake": "Custom quote · 9-inch cake from $150",
    "carrot-cake": "Custom quote · 9-inch cake from $130",
    "classic-vanilla-cupcakes": "$1.25 each · 6-pack $7 · dozen $14",
    "classic-chocolate-cupcakes": "$1.25 each · 6-pack $7 · dozen $14",
    "red-velvet-cupcakes": "$1.25 each · 6-pack $7 · dozen $14",
    "carrot-cupcakes": "$1.25 each · 6-pack $7 · dozen $14",
    "pasteis-de-nata": "$1.75 each · 6-pack $10 · dozen $19.50",
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
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "toffee-brown-butter-espresso": fixed("cookies", [
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "classic-chocolate-chip": fixed("cookies", [
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "cranberry-white-chocolate-oatmeal": fixed("cookies", [
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "white-chocolate-macadamia": fixed("cookies", [
      ["each", "Each", 1, 375, null],
      ["pack-6", "6-pack", 6, 2125, 2250],
      ["dozen", "Dozen", 12, 4175, 4500],
    ]),
    "smores-cookie": fixed("cookies", [
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "peanut-butter-blossom": fixed("cookies", [
      ["each", "Each", 1, 350, null],
      ["pack-6", "6-pack", 6, 2000, 2100],
      ["dozen", "Dozen", 12, 3900, 4200],
    ]),
    "classic-fudge-brownie": fixed("brownies-blondies", [
      ["each", "Each", 1, 300, null],
      ["pack-4", "4-pack", 4, 1150, 1200],
      ["dozen", "Dozen", 12, 3350, 3600],
    ]),
    "funfetti-blondie": fixed("brownies-blondies", [
      ["each", "Each", 1, 300, null],
      ["pack-4", "4-pack", 4, 1150, 1200],
      ["dozen", "Dozen", 12, 3350, 3600],
    ]),
    "chocolate-chip-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 300, null],
      ["pack-6", "6-pack", 6, 1700, 1800],
    ]),
    "blueberry-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 300, null],
      ["pack-6", "6-pack", 6, 1700, 1800],
    ]),
    "coffee-cake-jumbo-muffin": fixed("muffins", [
      ["each", "Each", 1, 300, null],
      ["pack-6", "6-pack", 6, 1700, 1800],
    ]),
    "jumbo-cinnamon-roll": fixed(null, [
      ["each", "Each", 1, 450, null],
      ["pack-6", "6-pack", 6, 2575, 2700],
    ]),
    "bacon-gruyere-onion-quiche": fixed(null, [
      ["each", "Each", 1, 400, null],
      ["pack-6", "6-pack", 6, 2275, 2400],
      ["dozen", "Dozen", 12, 4475, 4800],
    ]),
    "assorted-individual-tartlets": {
      mode: "builder",
      mixGroup: "tartlets",
      offers: [
        ["assorted-4", "4-count assortment", 4, 2650, null],
      ],
    },
    "vanilla-custard-fresh-berry-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 700, null],
      ["pack-4", "4-pack", 4, 2650, 2800],
    ]),
    "lemon-cream-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 700, null],
      ["pack-4", "4-pack", 4, 2650, 2800],
    ]),
    "chocolate-hazelnut-tartlet": fixed("tartlets", [
      ["each", "Each", 1, 700, null],
      ["pack-4", "4-pack", 4, 2650, 2800],
    ]),
    "classic-tiramisu": fixed(null, [
      ["each", "Per slice", 1, 700, null],
    ]),
    "traditional-portuguese-flan": fixed(null, [
      ["each", "Per slice", 1, 450, null],
      ["whole", "Whole flan", 5, 2000, 2250],
    ]),
    chocoflan: fixed(null, [
      ["each", "Per slice", 1, 500, null],
      ["whole", "Whole dessert", 5, 2500, null],
    ]),
    "new-york-style-cheesecake": fixed(null, [
      ["each", "Whole 9-inch cheesecake", 1, 5000, null],
    ]),
    "four-layer-chocolate-cake": quote,
    "carrot-cake": quote,
    "classic-vanilla-cupcakes": fixed(null, [
      ["each", "Each", 1, 125, null],
      ["pack-6", "6-pack", 6, 700, 750],
      ["dozen", "Dozen", 12, 1400, 1500],
    ]),
    "classic-chocolate-cupcakes": fixed(null, [
      ["each", "Each", 1, 125, null],
      ["pack-6", "6-pack", 6, 700, 750],
      ["dozen", "Dozen", 12, 1400, 1500],
    ]),
    "red-velvet-cupcakes": fixed(null, [
      ["each", "Each", 1, 125, null],
      ["pack-6", "6-pack", 6, 700, 750],
      ["dozen", "Dozen", 12, 1400, 1500],
    ]),
    "carrot-cupcakes": fixed(null, [
      ["each", "Each", 1, 125, null],
      ["pack-6", "6-pack", 6, 700, 750],
      ["dozen", "Dozen", 12, 1400, 1500],
    ]),
    "pasteis-de-nata": fixed(null, [
      ["each", "Each", 1, 175, null],
      ["pack-6", "6-pack", 6, 1000, 1050],
      ["dozen", "Dozen", 12, 1950, 2100],
    ]),
  });
});

test("exactly the two layer cakes retain the custom-quote workflow", () => {
  const quoteOnlyIds = menuCategories
    .flatMap((category) => category.items)
    .filter((item) => item.pricing.mode === "quote")
    .map((item) => item.id)
    .sort();

  assert.deepEqual(quoteOnlyIds, ["carrot-cake", "four-layer-chocolate-cake"]);
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
    2050,
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
    4000,
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
    1150,
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
    1700,
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
    2650,
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
    2650,
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
    2750,
  );
  assert.deepEqual(priceFixedQuantity(menuData, "classic-chocolate-chip", 19), {
    subtotalCents: 6250,
    appliedOffers: [
      { offerId: "dozen", count: 1 },
      { offerId: "pack-6", count: 1 },
      { offerId: "each", count: 1 },
    ],
  });
  assert.throws(
    () => priceOfferCart(menuData, [{ productId: "carrot-cake", offerId: "quote" }]),
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

test("category stamps render responsively without entering the sticky navigation", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /class="category-heading"/);
  assert.match(app, /class="category-illustration"/);
  assert.match(app, /alt="" aria-hidden="true" loading="lazy" decoding="async"/);
  assert.doesNotMatch(app, /category-nav-list[^\n]*category-illustration/);
  assert.match(css, /\.category-heading\s*{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/s);
  assert.match(css, /\.category-illustration\s*{[^}]*width: clamp\(96px, 10vw, 124px\)[^}]*max-width: 124px/s);
  assert.match(css, /padding-block: clamp\(40px, 6vw, 64px\) clamp\(56px, 9vw, 112px\)/);
  assert.match(css, /@media \(max-width: 820px\), \(hover: none\), \(pointer: coarse\)[^]*?\.category-illustration\s*{[^}]*width: clamp\(64px, 20vw, 78px\)/);
  assert.match(css, /@media \(forced-colors: active\)[^]*?\.category-illustration\s*{\s*display: none/);
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
