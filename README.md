# Coco & Toffee Menu & Order Requests

## Production hosting

The only full storefront is https://cocoandtoffee.pages.dev/.
Cloudflare Pages builds `main` with `npm run build` and publishes only `dist/`.
GitHub is the source repository only; GitHub Pages is disabled and no GitHub workflow
publishes the website. Pushing to `main` gives Cloudflare the source for the next build.
Submitted orders stay in the same Supabase database. Browser carts cannot transfer
between different website origins.

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
- Cloudflare Pages deployment sourced from GitHub, with menu data verified on every pull request
- The public menu works without service credentials; unconfigured forms provide an honest email/copy fallback

## Service activation

The storefront is a static Cloudflare Pages site. Automatic submission, owner sign-in and owner email
alerts require the separately deployed Supabase functions and configured providers. See
[`supabase/README.md`](supabase/README.md) for the deployment checklist.

The `order-endpoint` and `turnstile-site-key` meta tags in `index.html` connect the production
forms to Supabase and Cloudflare Turnstile. Customers can use the email or phone-only text fallback
if online sending is unavailable; the page never claims an unsent request was received. Add an
E.164 business number (for example, `+16175550123`) to the `sms-recipient` meta tag to pre-address text
messages. When it is blank, the customer chooses the recipient in their messaging app. `owner-config.js` contains
only public browser configuration. Never put server secrets in browser files.

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
This ensures browsers and the Cloudflare Pages CDN request the new image instead of a cached copy.

## Preview and verify

Node.js 20 or newer is the only requirement.

```bash
npm run dev
npm test
npm run build
```

The local preview opens at `http://127.0.0.1:4173`. The public build is written to `dist/`.

## Publish with Cloudflare Pages

The Cloudflare Pages project is connected to `Ultras0nic/coco-toffee-menu`. It watches `main`,
runs `npm run build`, and publishes `dist/` to https://cocoandtoffee.pages.dev/. GitHub Actions
only verifies pull requests; it has no Pages deployment permission or publish job.

The GitHub repository itself is public. Keep credentials, production costs, and internal quote
guides outside this repository even though only the allow-listed `dist/` files are published.

## Important content note

Allergen statements must be verified before publishing. Do not infer allergens from a product name.
The current placeholders ask customers to confirm details before ordering.
