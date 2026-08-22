import { menuCategories, selectionChecklist } from "./menu-data.js";

const navList = document.querySelector("#category-nav-list");
const menuSections = document.querySelector("#menu-sections");
const preview = document.querySelector("#product-preview");
const previewClose = document.querySelector(".preview-close");
const scrim = document.querySelector("#mobile-scrim");
const previewImage = document.querySelector("#preview-image");
const previewPlaceholder = document.querySelector("#preview-placeholder");
const selectionList = document.querySelector("#selection-list");
const copyButton = document.querySelector("#copy-checklist");
const copyStatus = document.querySelector("#copy-status");

const itemIndex = new Map();
let activeButton = null;

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

function updateImage(item) {
  previewImage.hidden = true;
  previewPlaceholder.hidden = false;
  previewImage.removeAttribute("src");
  previewImage.alt = "";

  if (!item.photo) return;

  previewImage.onload = () => {
    previewImage.hidden = false;
    previewPlaceholder.hidden = true;
  };
  previewImage.onerror = () => {
    previewImage.hidden = true;
    previewPlaceholder.hidden = false;
  };
  previewImage.alt = item.name;
  previewImage.src = item.photo;
}

function activateItem(button, openCompact = false) {
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

  if (openCompact && isCompactInteraction()) openPreview();
}

function openPreview() {
  preview.classList.add("is-open");
  scrim.hidden = false;
  document.body.classList.add("preview-open");
  requestAnimationFrame(() => previewClose.focus());
}

function closePreview({ returnFocus = true } = {}) {
  preview.classList.remove("is-open");
  scrim.hidden = true;
  document.body.classList.remove("preview-open");
  if (returnFocus && activeButton) activeButton.focus();
}

function attachInteractions() {
  document.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && !isCompactInteraction()) activateItem(button);
    });
    button.addEventListener("focus", () => {
      if (!isCompactInteraction()) activateItem(button);
    });
    button.addEventListener("click", () => activateItem(button, true));
  });

  previewClose.addEventListener("click", () => closePreview());
  scrim.addEventListener("click", () => closePreview());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && preview.classList.contains("is-open")) closePreview();
  });

  window.addEventListener("resize", () => {
    if (!isCompactInteraction()) closePreview({ returnFocus: false });
  });
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
  if (button) activateItem(button, false);
}

renderMenu();
attachInteractions();
restoreProductFromHash();
copyButton.addEventListener("click", copyChecklist);
