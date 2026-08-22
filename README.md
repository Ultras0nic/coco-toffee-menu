# Coco & Toffee Interactive Menu

A future-ready, dependency-free menu website based on the final three-page Coco & Toffee menu.
It preserves the warm beige paper, hand-drawn typography, black rules and spacious two-column
menu layout while adding accessible product detail cards.

## What is already included

- All 8 menu categories and 48 products from the final PDF
- Desktop hover and keyboard-focus product details
- Mobile tap-to-open details with close, outside-tap and Escape support
- Photo, description, texture, allergen and pricing placeholders
- The complete selection-request checklist
- A one-click checklist copy feature
- Automated content validation
- GitHub Pages deployment workflow
- No paid service, database, server or third-party tracking

## Edit products later

Open `data/menu.json`. That JSON file is the menu's single source of truth and acts as a simple
repository-backed content store. The local preview and the published GitHub Pages website both
read the same file.

To add details, replace a product line with an expanded version:

```json
{
  "id": "biscoff",
  "name": "Biscoff",
  "description": "Your approved flavor description.",
  "texture": "Your approved texture.",
  "allergens": "Your verified allergen statement.",
  "price": "Your price or Custom quote.",
  "photo": "assets/menu/biscoff.jpg"
}
```

Put the matching photo in `assets/menu/`. If the photo is missing, the website automatically shows
the designed **Photo coming soon** placeholder.

## Preview and verify

Node.js 20 or newer is the only requirement.

```bash
npm run dev
npm test
npm run build
```

The local preview opens at `http://127.0.0.1:4173`. The public build is written to `dist/`.

## Publish free with GitHub Pages

1. Create a public GitHub repository, for example `coco-toffee-menu`.
2. Push this repository to its `main` branch.
3. On GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, select **GitHub Actions**.
5. Open the **Actions** tab and run **Deploy Coco & Toffee menu**, or push a new commit.
6. GitHub will show the free public URL after deployment succeeds.

The workflow publishes only the allow-listed website files from `dist/`, including
`data/menu.json`. Drafts, tests and internal notes are not included in the public website.

## Important content note

Allergen statements must be verified before publishing. Do not infer allergens from a product name.
The current placeholders ask customers to confirm details before ordering.
