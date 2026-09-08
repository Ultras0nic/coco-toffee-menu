export const DEFAULT_PROCESSING_POLICY = Object.freeze({
  processingFeeBps: 290,
  fixedFeeCents: 30,
  targetMarginBps: 3500,
});

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
}

function getItems(menuData) {
  return menuData.menuCategories.flatMap((category) => category.items);
}

export function indexProducts(menuData) {
  return new Map(getItems(menuData).map((item) => [item.id, item]));
}

export function roundUpCents(valueCents, incrementCents) {
  if (!Number.isFinite(valueCents) || valueCents < 0) {
    throw new TypeError("valueCents must be a non-negative finite number.");
  }
  assertPositiveInteger(incrementCents, "incrementCents");
  return Math.ceil((valueCents - Number.EPSILON) / incrementCents) * incrementCents;
}

export function minimumSubtotalCents(
  fullCostCents,
  policy = DEFAULT_PROCESSING_POLICY,
) {
  if (!Number.isInteger(fullCostCents) || fullCostCents < 0) {
    throw new TypeError("fullCostCents must be a non-negative integer.");
  }
  const denominator =
    10_000 - policy.processingFeeBps - policy.targetMarginBps;
  if (denominator <= 0) {
    throw new RangeError("Fee and target margin leave no saleable revenue.");
  }
  return Math.ceil(
    ((fullCostCents + policy.fixedFeeCents) * 10_000) / denominator,
  );
}

export function contributionMarginBps(
  subtotalCents,
  fullCostCents,
  policy = DEFAULT_PROCESSING_POLICY,
) {
  assertPositiveInteger(subtotalCents, "subtotalCents");
  if (!Number.isInteger(fullCostCents) || fullCostCents < 0) {
    throw new TypeError("fullCostCents must be a non-negative integer.");
  }
  const processingFeeCents =
    (subtotalCents * policy.processingFeeBps) / 10_000 +
    policy.fixedFeeCents;
  return (
    ((subtotalCents - processingFeeCents - fullCostCents) / subtotalCents) *
    10_000
  );
}

export function resolveTrustedOffer(menuData, productId, offerId) {
  const item = indexProducts(menuData).get(productId);
  if (!item) throw new RangeError(`Unknown product: ${productId}`);
  if (item.pricing.mode !== "fixed") {
    throw new RangeError(`${productId} does not have fixed-price offers.`);
  }
  const offer = item.pricing.offers.find((candidate) => candidate.id === offerId);
  if (!offer) throw new RangeError(`Unknown offer ${offerId} for ${productId}.`);
  return { item, offer };
}

export function priceOfferCart(menuData, requestedLines) {
  if (!Array.isArray(requestedLines) || requestedLines.length === 0) {
    throw new TypeError("requestedLines must contain at least one offer.");
  }
  return requestedLines.reduce((subtotalCents, requestedLine) => {
    const count = requestedLine.count ?? 1;
    assertPositiveInteger(count, "offer count");
    const { offer } = resolveTrustedOffer(
      menuData,
      requestedLine.productId,
      requestedLine.offerId,
    );
    return subtotalCents + offer.priceCents * count;
  }, 0);
}

export function priceFixedQuantity(menuData, productId, units) {
  assertPositiveInteger(units, "units");
  const item = indexProducts(menuData).get(productId);
  if (!item) throw new RangeError(`Unknown product: ${productId}`);
  if (item.pricing.mode !== "fixed") {
    throw new RangeError(`${productId} does not have fixed-price offers.`);
  }

  const offers = [...item.pricing.offers].sort((a, b) => b.units - a.units);
  if (!offers.some((offer) => offer.units === 1)) {
    throw new RangeError(`${productId} has no each-price fallback.`);
  }

  let remainingUnits = units;
  let subtotalCents = 0;
  const appliedOffers = [];
  for (const offer of offers) {
    const count = Math.floor(remainingUnits / offer.units);
    if (count === 0) continue;
    subtotalCents += count * offer.priceCents;
    remainingUnits -= count * offer.units;
    appliedOffers.push({ offerId: offer.id, count });
  }
  return { subtotalCents, appliedOffers };
}

export function priceMixedBundle(
  menuData,
  { mixGroup, bundleUnits, selections },
) {
  const group = menuData.pricingCatalog.mixGroups[mixGroup];
  if (!group) throw new RangeError(`Unknown mix group: ${mixGroup}`);
  if (!group.bundleQuantities.includes(bundleUnits)) {
    throw new RangeError(
      `${mixGroup} does not support a ${bundleUnits}-unit bundle.`,
    );
  }
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new TypeError("selections must contain at least one product.");
  }
  if (
    Number.isInteger(group.minDistinctProducts) &&
    selections.length < group.minDistinctProducts
  ) {
    throw new RangeError(
      `${mixGroup} mix requires at least ${group.minDistinctProducts} flavors.`,
    );
  }
  if (
    Number.isInteger(group.maxDistinctProducts) &&
    selections.length > group.maxDistinctProducts
  ) {
    throw new RangeError(
      `${mixGroup} mix allows at most ${group.maxDistinctProducts} flavors.`,
    );
  }

  const products = indexProducts(menuData);
  const selectedIds = new Set();
  let selectedUnits = 0;
  let weightedPriceCents = 0;

  for (const selection of selections) {
    assertPositiveInteger(selection.units, "selection units");
    if (
      Number.isInteger(group.minUnitsPerProduct) &&
      selection.units < group.minUnitsPerProduct
    ) {
      throw new RangeError(
        `${mixGroup} mix requires at least ${group.minUnitsPerProduct} units per flavor.`,
      );
    }
    if (selectedIds.has(selection.productId)) {
      throw new RangeError(`Duplicate selection: ${selection.productId}`);
    }
    selectedIds.add(selection.productId);
    const item = products.get(selection.productId);
    if (!item) throw new RangeError(`Unknown product: ${selection.productId}`);
    if (
      item.pricing.mode !== "fixed" ||
      item.pricing.mixGroup !== mixGroup
    ) {
      throw new RangeError(`${selection.productId} is not in ${mixGroup}.`);
    }
    const bundleOffer = item.pricing.offers.find(
      (offer) => offer.units === bundleUnits,
    );
    if (!bundleOffer) {
      throw new RangeError(
        `${selection.productId} has no ${bundleUnits}-unit mix rate.`,
      );
    }
    selectedUnits += selection.units;
    weightedPriceCents +=
      (selection.units * bundleOffer.priceCents) / bundleUnits;
  }

  if (group.exactFill && selectedUnits !== bundleUnits) {
    throw new RangeError(
      `${mixGroup} bundle requires exactly ${bundleUnits} units; received ${selectedUnits}.`,
    );
  }
  return roundUpCents(weightedPriceCents, group.roundUpToCents);
}

export function priceBuilderBundle(
  menuData,
  { productId, offerId, selections },
) {
  const item = indexProducts(menuData).get(productId);
  if (!item) throw new RangeError(`Unknown product: ${productId}`);
  if (item.pricing.mode !== "builder") {
    throw new RangeError(`${productId} is not a bundle builder.`);
  }
  const offer = item.pricing.offers.find((candidate) => candidate.id === offerId);
  if (!offer) throw new RangeError(`Unknown offer ${offerId} for ${productId}.`);

  const allowedComponents = new Set(item.pricing.componentIds);
  for (const selection of selections ?? []) {
    if (!allowedComponents.has(selection.productId)) {
      throw new RangeError(
        `${selection.productId} is not an allowed component of ${productId}.`,
      );
    }
  }

  return priceMixedBundle(menuData, {
    mixGroup: item.pricing.mixGroup,
    bundleUnits: offer.units,
    selections,
  });
}
