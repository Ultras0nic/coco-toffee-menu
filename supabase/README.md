# Coco & Toffee ordering backend

This folder contains the database migrations and Supabase Edge Functions for order requests, the private owner inbox, Stripe Checkout, contact messages, and retryable email notifications. It is deployment-ready code, but it is intentionally inactive until the accounts and secrets below are configured.

## What stays private

Never put these values in GitHub Pages, `owner-config.js`, commits, screenshots, or customer emails:

- Supabase service-role key
- Stripe secret and webhook signing secret
- Resend API key
- Turnstile secret
- cron secret
- the populated `PRIVATE_QUOTE_GUIDE_JSON`

The Supabase URL and publishable/anon key are designed for browser use and belong in `owner-config.js`. Row-level security blocks direct browser access to orders and customer data. The owner Edge Function independently verifies the signed-in email is exactly `jericholi334677@gmail.com`.

## One-time setup

1. Create a Supabase project in the U.S. region you prefer. Save the project URL, publishable/anon key, and service-role key.
2. In the Supabase SQL editor, run the three files in `migrations/` in filename order. Run each file once and stop if any statement fails.
3. In **Authentication → Users**, invite `jericholi334677@gmail.com`. Do not create a password. In **URL Configuration**, set the site URL to the public menu and add the exact `owner.html` URL as an allowed redirect.
4. Copy `owner-config.example.js` to `owner-config.js` and replace only the project URL and publishable/anon key placeholders. Never put a service-role key there.
5. Copy `.env.example` to a private local environment file. Fill every secret. Load the six private quote starting amounts from the untracked `commerce-private-setup.json` into `PRIVATE_QUOTE_GUIDE_JSON`; keep amounts in cents and never commit the populated value.
6. Add the environment values as Supabase project secrets, then deploy all six functions. The verification modes in `config.toml` are intentional: public forms and provider/cron callbacks perform their own checks, while `owner-orders` also requires a valid Supabase access token.
7. In the public `index.html`, set `order-endpoint` to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/` and set `turnstile-site-key` to the public Turnstile site key.

Typical CLI flow after installing and signing in to the Supabase CLI:

```text
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set --env-file supabase/.env.production
supabase functions deploy catalog
supabase functions deploy submit-order --no-verify-jwt
supabase functions deploy contact --no-verify-jwt
supabase functions deploy owner-orders
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy process-notifications --no-verify-jwt
```

## Stripe

Start in Stripe test mode. Create a webhook endpoint at:

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

Subscribe only to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Put the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`. Keep `STRIPE_LIVE_MODE=false` until the full test flow is proven. Checkout links expire in approximately 24 hours. The webhook verifies the signature, live/test environment, exact order, session, payment intent, currency, and amount. Duplicate webhooks are safe. If a webhook arrives in the short interval before its Checkout Session is saved, the function returns an error so Stripe retries it instead of losing the payment event.

Refunds are initiated by the owner in Stripe. The verified `charge.refunded` webhook updates the order to partially or fully refunded. Never mark a paid order cancelled in the database before processing the refund.

## Resend and the email queue

Verify a sending domain in Resend and use an address on that domain for `RESEND_FROM_EMAIL`. Until that is complete, the owner inbox provides a copyable payment email for manual sending from Gmail.

Every saved order/contact and important order status change inserts its email jobs in the same database transaction. `process-notifications` leases ready jobs, retries failures with increasing delays, and recovers a worker lease after five minutes. Run it at least once per minute using Supabase Cron or another scheduler, sending `POST` with the private `x-cron-secret` header. It can also be run manually from the signed-in owner inbox.

Configure an alert for queue rows that remain `failed`, have 10 attempts, or are older than 15 minutes. Email failure does not delete or roll back an order.

## Turnstile, origins, and rate limits

Create a Cloudflare Turnstile site for `ultras0nic.github.io`. Put the public site key in `index.html` and its secret only in Supabase. `TURNSTILE_ALLOWED_HOSTNAMES` is checked after Cloudflare validates the token. `ALLOWED_ORIGINS` should contain only the production origin plus explicit local development origins when needed.

The database-backed rate limiter protects order and contact submission. Leave `TURNSTILE_BYPASS_FOR_LOCAL=false` in production.

## Release verification

Before accepting real orders:

1. Run the backend tests: `node --test supabase/tests/*.test.mjs`.
2. Submit one fixed-price pickup request and one mixed custom-dessert delivery request in Stripe test mode.
3. Confirm the browser total cannot change the server price.
4. Approve each request in the owner inbox and confirm the approved date, time, tax, delivery, and custom amount appear in the customer email.
5. Pay one Checkout link and verify the webhook changes the order directly to `confirmed` with `payment_status=paid`.
6. Replay the same Stripe event and confirm it has no second effect.
7. Refund a test payment and confirm the order/refund amounts update.
8. Temporarily use an invalid Resend key, verify the order is still saved, restore the key, and retry the email queue.
9. Confirm a non-owner Supabase account receives `403` from both owner functions and cannot read any commerce table directly.
10. Confirm the pickup address is not present in the public page, public configuration, or pre-approval messages.

Keep Stripe in test mode and leave the public endpoint meta blank if any of these checks fail.
