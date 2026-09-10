# Coco & Toffee Menu & Order Requests

A future-ready, dependency-free menu website based on the current Silver Stone Castle recipe collection.
It preserves the warm beige paper, hand-drawn typography, black rules and spacious two-column
menu layout while adding accessible product detail cards.

## What is already included

- All 8 menu categories and 26 customer-facing products from the current recipe collection
- Approved product photography for COCO’s cookie, TOFFEE’s cookie, cranberry oatmeal,
  classic chocolate chip and the jumbo cinnamon roll
- Desktop hover and keyboard-focus product details
- Mobile tap-to-open details with close, outside-tap and Escape support
- Product details and approved individual/package prices
- Persistent order bag, mixed boxes, package savings, and custom-dessert requests
- Pickup/delivery request forms and a contact form
- An owner-only review interface and Supabase/Resend email integration
- Automated content validation
- GitHub Pages deployment workflow
- The public menu works without service credentials; unconfigured forms provide an honest email/copy fallback

## Service activation

The storefront is a static GitHub Pages site. Automatic submission, owner sign-in and owner email
alerts require the separately deployed Supabase functions and configured providers. See
[`supabase/README.md`](supabase/README.md) for the deployment checklist.

The empty `order-endpoint` and `turnstile-site-key` meta tags in `index.html` intentionally leave
automatic sending disabled until setup is complete. Customers can prepare an order and use the
provided email or phone-only text link; the page never claims an unsent request was received. Add an
E.164 business number (for example, `+16175550123`) to the `sms-recipient` meta tag to pre-address text
messages. When it is blank, the customer chooses the recipient in their messaging app. `owner-config.js` contains
only public configuration placeholders. Never put server secrets in browser files.

The first release collects requests only. The owner reviews each request and replies manually from
Gmail with availability, final pricing and next steps. Online payment controls remain disabled.

## Brand logo

The header and browser icon use `assets/brand/coco-toffee-logo.jpg`. Keep replacement artwork
square so the circular presentation remains correctly cropped on desktop and mobile.

## Edit products later

Open `data/menu.json`. The local preview and published website both read this content file.
Its numeric `pricing` offers are the storefront pricing source; displayed price text is not parsed.
When changing offers, update the authoritative Supabase catalog seed/deployed catalog as well.
Tests compare the public offers with the SQL seed to catch pricing drift.

To add or revise details, update the matching product object:

```json
{
  "id": "classic-chocolate-chip",
  "name": "Classic Chocolate Chip Cookie",
  "description": "Your approved flavor description.",
  "texture": "Your approved texture.",
  "allergens": "Your verified allergen statement.",
  "price": "Your price or Custom quote.",
  "photo": "assets/menu/classic-chocolate-chip-cookie.jpg"
}
```

Put the matching photo in `assets/menu/`. If the photo is missing, the website automatically shows
the designed **Photo coming soon** placeholder.

When replacing a photo without changing its filename, increment `assetVersion` in `data/menu.json`.
This ensures browsers and the GitHub Pages CDN request the new image instead of a cached copy.

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
`data/menu.json` and the owner-interface assets. Backend code is deployed separately.
The GitHub repository itself is public: excluding a file from `dist/` does not make it private.
Keep credentials, production costs, and internal quote guides outside this repository.

## Important content note

Allergen statements must be verified before publishing. Do not infer allergens from a product name.
The current placeholders ask customers to confirm details before ordering.
