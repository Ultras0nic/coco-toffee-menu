async function loadMenuData() {
  const response = await fetch("./data/menu.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Menu data request failed: ${response.status}`);
  return response.json();
}

let menuCategories = [];
let selectionChecklist = [];
let menuAssetVersion = "";

try {
  ({ menuCategories, selectionChecklist, assetVersion: menuAssetVersion } = await loadMenuData());
} catch (error) {
  console.error(error);
  document.querySelector("#menu-sections").innerHTML = `
    <section class="data-error" role="alert">
      <h2>Menu temporarily unavailable</h2>
      <p>Please refresh the page or contact Coco & Toffee directly.</p>
    </section>`;
  throw error;
}

const navList = document.querySelector("#category-nav-list");
const menuSections = document.querySelector("#menu-sections");
const preview = document.querySelector("#product-preview");
const previewClose = document.querySelector(".preview-close");
const scrim = document.querySelector("#mobile-scrim");
const previewImage = document.querySelector("#preview-image");
const previewPlaceholder = document.querySelector("#preview-placeholder");
const productPeek = document.querySelector("#product-peek");
const productPeekImage = document.querySelector("#product-peek-image");
const productPeekPlaceholder = document.querySelector("#product-peek-placeholder");
const productPeekName = document.querySelector("#product-peek-name");
const sloganLightboard = document.querySelector("#slogan-lightboard");
const selectionList = document.querySelector("#selection-list");
const copyButton = document.querySelector("#copy-checklist");
const copyStatus = document.querySelector("#copy-status");

const itemIndex = new Map();
let activeButton = null;
let peekButton = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isCompactInteraction() {
  return window.matchMedia("(max-width: 820px), (hover: none), (pointer: coarse)").matches;
}

// Framework-free adaptation of Cult UI's MIT-licensed LightBoard component.
const lightboardFont = {
  " ": ["0000", "0000", "0000", "0000", "0000"],
  A: ["0110", "1001", "1111", "1001", "1001"],
  B: ["1110", "1001", "1110", "1001", "1110"],
  E: ["1111", "1000", "1110", "1000", "1111"],
  F: ["1111", "1000", "1110", "1000", "1000"],
  G: ["0111", "1000", "1011", "1001", "0111"],
  I: ["111", "010", "010", "010", "111"],
  L: ["1000", "1000", "1000", "1000", "1111"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  R: ["1110", "1001", "1110", "1010", "1001"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  V: ["10001", "10001", "01010", "01010", "00100"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  "🌼": ["00200", "02220", "22222", "02220", "00200"],
  "✨": ["00300", "00300", "33333", "00300", "00300"],
};

function initSloganLightboard() {
  if (!sloganLightboard) return;

  const context = sloganLightboard.getContext("2d");
  if (!context) return;

  const accessibleText = sloganLightboard.nextElementSibling?.textContent.trim() || "";
  const rows = 9;
  const updateInterval = 70;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const colors = {
    background: "rgba(215, 157, 104, 0.2)",
    text: "#ffd58f",
    flower: "#efa882",
    sparkle: "#fff4ce",
  };

  let columns = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  let lightPitch = 0;
  let lightRadius = 0;
  let offset = 0;
  let pattern = [];
  let lastUpdate = 0;
  let isHovered = false;

  function buildPattern() {
    const normalizedText = `   ${accessibleText.toUpperCase()}   `.replace(/\s+/g, "   ");
    const glyphs = [...normalizedText].map(
      (character) => lightboardFont[character] || lightboardFont[" "],
    );
    const textRows = Array.from({ length: 5 }, (_, rowIndex) =>
      glyphs.flatMap((glyph) => [
        ...glyph[rowIndex].split("").map(Number),
        0,
      ]),
    );
    const emptyRow = Array(textRows[0].length).fill(0);
    const topPadding = Math.floor((rows - textRows.length) / 2);
    const bottomPadding = rows - textRows.length - topPadding;

    pattern = [
      ...Array.from({ length: topPadding }, () => [...emptyRow]),
      ...textRows,
      ...Array.from({ length: bottomPadding }, () => [...emptyRow]),
    ];

    pattern = pattern.map((row) => {
      const repeatedRow = [...row];
      while (repeatedRow.length < columns * 2) repeatedRow.push(...row);
      return repeatedRow;
    });
    offset %= pattern[0].length;
  }

  function drawLightboard() {
    if (!pattern.length || !columns) return;

    context.clearRect(0, 0, cssWidth, cssHeight);
    const patternWidth = pattern[0].length;

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const state = pattern[rowIndex][(columnIndex + offset) % patternWidth];
        const fillColor =
          state === 1
            ? colors.text
            : state === 2
              ? colors.flower
              : state === 3
                ? colors.sparkle
                : colors.background;

        context.fillStyle = fillColor;
        context.shadowColor = state === 0 ? "transparent" : fillColor;
        context.shadowBlur = state === 0 ? 0 : 5;
        context.beginPath();
        context.arc(
          columnIndex * lightPitch + lightPitch / 2,
          rowIndex * lightPitch + lightPitch / 2,
          lightRadius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }

    context.shadowBlur = 0;
  }

  function resizeLightboard() {
    const bounds = sloganLightboard.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = bounds.width;
    cssHeight = bounds.height;
    lightPitch = cssHeight / rows;
    lightRadius = Math.max(1.75, lightPitch * 0.34);
    columns = Math.max(1, Math.ceil(cssWidth / lightPitch));

    sloganLightboard.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    sloganLightboard.height = Math.max(1, Math.round(cssHeight * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildPattern();
    drawLightboard();
  }

  function animate(timestamp) {
    if (
      !motionPreference.matches &&
      !isHovered &&
      timestamp - lastUpdate >= updateInterval
    ) {
      offset = (offset + 1) % pattern[0].length;
      lastUpdate = timestamp;
      drawLightboard();
    }
    requestAnimationFrame(animate);
  }

  sloganLightboard.addEventListener("pointerenter", () => {
    isHovered = true;
  });
  sloganLightboard.addEventListener("pointerleave", () => {
    isHovered = false;
    lastUpdate = performance.now();
  });
  motionPreference.addEventListener("change", drawLightboard);

  const resizeObserver = new ResizeObserver(resizeLightboard);
  resizeObserver.observe(sloganLightboard);
  resizeLightboard();
  requestAnimationFrame(animate);
}

function renderMenu() {
  navList.innerHTML = menuCategories
    .map((category) => `<a href="#${escapeHtml(category.id)}">${escapeHtml(category.name)}</a>`)
    .join("");

  menuSections.innerHTML = menuCategories
    .map((category) => {
      const items = category.items
        .map((item) => {
          itemIndex.set(item.id, { item, category });
          return `
            <li>
              <button
                class="menu-item"
                type="button"
                data-item-id="${escapeHtml(item.id)}"
                aria-controls="product-preview"
                aria-expanded="false"
              >
                <span>${escapeHtml(item.name)}</span>
                <span class="item-cue" aria-hidden="true">View</span>
              </button>
            </li>`;
        })
        .join("");

      return `
        <section class="menu-category" id="${escapeHtml(category.id)}" aria-labelledby="${escapeHtml(category.id)}-title">
          <h2 id="${escapeHtml(category.id)}-title">${escapeHtml(category.name)}</h2>
          <ul class="item-grid">${items}</ul>
          <p class="category-note">${escapeHtml(category.note)}</p>
        </section>`;
    })
    .join("");

  selectionList.innerHTML = selectionChecklist
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function updateImageElements(image, placeholder, item) {
  image.hidden = true;
  placeholder.hidden = false;
  image.removeAttribute("src");
  image.alt = "";

  if (!item.photo) return;

  image.onload = () => {
    image.hidden = false;
    placeholder.hidden = true;
  };
  image.onerror = () => {
    image.hidden = true;
    placeholder.hidden = false;
  };
  image.alt = item.name;
  const photoUrl = new URL(item.photo, document.baseURI);
  if (menuAssetVersion) photoUrl.searchParams.set("v", menuAssetVersion);
  image.src = photoUrl.href;
}

function updateImage(item) {
  updateImageElements(previewImage, previewPlaceholder, item);
}

function showProductPeek(button) {
  if (isCompactInteraction() || preview.classList.contains("is-open")) return;

  const record = itemIndex.get(button.dataset.itemId);
  if (!record) return;

  peekButton = button;
  productPeekName.textContent = record.item.name;
  updateImageElements(productPeekImage, productPeekPlaceholder, record.item);

  const buttonRect = button.getBoundingClientRect();
  const viewportPadding = 16;
  const gap = 16;
  const peekWidth = Math.min(300, window.innerWidth - viewportPadding * 2);
  const peekHeight = productPeek.offsetHeight;
  let left = buttonRect.right + gap;

  if (left + peekWidth > window.innerWidth - viewportPadding) {
    left = buttonRect.left - peekWidth - gap;
  }

  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - peekWidth - viewportPadding),
  );
  const top = Math.max(
    viewportPadding,
    Math.min(
      buttonRect.top + buttonRect.height / 2 - peekHeight / 2,
      window.innerHeight - peekHeight - viewportPadding,
    ),
  );

  productPeek.style.setProperty("--peek-left", `${left}px`);
  productPeek.style.setProperty("--peek-top", `${top}px`);
  productPeek.classList.add("is-visible");
}

function hideProductPeek(button = null) {
  if (button && peekButton !== button) return;
  productPeek.classList.remove("is-visible");
  peekButton = null;
}

function activateItem(button, openOnClick = false) {
  const record = itemIndex.get(button.dataset.itemId);
  if (!record) return;

  if (activeButton && activeButton !== button) {
    activeButton.classList.remove("is-active");
    activeButton.setAttribute("aria-expanded", "false");
  }

  activeButton = button;
  button.classList.add("is-active");
  button.setAttribute("aria-expanded", "true");

  document.querySelector("#preview-category").textContent = record.category.name;
  document.querySelector("#preview-title").textContent = record.item.name;
  document.querySelector("#preview-description").textContent = record.item.description;
  document.querySelector("#preview-texture").textContent = record.item.texture;
  document.querySelector("#preview-allergens").textContent = record.item.allergens;
  document.querySelector("#preview-price").textContent = record.item.price;
  updateImage(record.item);
  history.replaceState(null, "", `#product-${record.item.id}`);

  if (openOnClick) openPreview();
}

function openPreview() {
  hideProductPeek();
  preview.scrollTop = 0;
  preview.classList.add("is-open");
  preview.setAttribute("aria-hidden", "false");
  scrim.hidden = false;
  document.body.classList.add("preview-open");
  requestAnimationFrame(() => previewClose.focus());
}

function closePreview({ returnFocus = true } = {}) {
  preview.classList.remove("is-open");
  preview.setAttribute("aria-hidden", "true");
  scrim.hidden = true;
  document.body.classList.remove("preview-open");
  if (activeButton) activeButton.setAttribute("aria-expanded", "false");
  if (returnFocus && activeButton) activeButton.focus();

  if (!isCompactInteraction() && location.hash.startsWith("#product-")) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}

function attachInteractions() {
  document.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") showProductPeek(button);
    });
    button.addEventListener("pointerleave", () => hideProductPeek(button));
    button.addEventListener("focus", () => showProductPeek(button));
    button.addEventListener("blur", () => hideProductPeek(button));
    button.addEventListener("click", () => {
      hideProductPeek();
      activateItem(button, true);
    });
  });

  previewClose.addEventListener("click", () => closePreview());
  scrim.addEventListener("click", () => closePreview());
  document.addEventListener("keydown", (event) => {
    if (!preview.classList.contains("is-open")) return;
    if (event.key === "Escape") closePreview();
    if (event.key === "Tab") {
      event.preventDefault();
      previewClose.focus();
    }
  });

  let compactInteraction = isCompactInteraction();
  window.addEventListener("resize", () => {
    hideProductPeek();
    const nextCompactInteraction = isCompactInteraction();
    if (nextCompactInteraction !== compactInteraction) {
      closePreview({ returnFocus: false });
      compactInteraction = nextCompactInteraction;
    }
  });
  window.addEventListener("scroll", () => hideProductPeek(), { passive: true });
}

async function copyChecklist() {
  const text = [
    "Coco & Toffee selection request",
    "",
    ...selectionChecklist.map((item) => `- ${item}: `),
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Checklist copied. Paste it into your message to Coco & Toffee.";
  } catch {
    copyStatus.textContent = "Copy was unavailable. Please use the checklist above.";
  }
}

function restoreProductFromHash() {
  const id = location.hash.replace(/^#product-/, "");
  if (!id || !itemIndex.has(id)) return;
  const button = document.querySelector(`[data-item-id="${CSS.escape(id)}"]`);
  if (button) activateItem(button, !isCompactInteraction());
}

renderMenu();
attachInteractions();
restoreProductFromHash();
initSloganLightboard();
copyButton.addEventListener("click", copyChecklist);
