# Coco & Toffee ordering backend

This folder contains the database migrations and Supabase Edge Functions for order requests, contact messages, the private owner inbox and retryable owner email alerts. The current launch is request-only: Stripe and customer auto-replies are intentionally disabled.

## What stays private

Never put these values in GitHub Pages, `owner-config.js`, commits, screenshots, or customer emails:

- Supabase service-role key
- Resend API key
- Turnstile secret
- cron secret
- any future payment or private quote configuration

The Supabase URL and publishable/anon key are designed for browser use and belong in `owner-config.js`. Row-level security blocks direct browser access to orders and customer data. The owner Edge Function independently verifies the signed-in email is exactly `jericholi334677@gmail.com`.

## One-time setup

1. Create a Supabase project in the U.S. region you prefer. Save the project URL, publishable/anon key, and service-role key.
2. In the Supabase SQL editor, run every file in `migrations/` in filename order. Run each file once and stop if any statement fails.
3. In **Authentication → Users**, invite `jericholi334677@gmail.com`. Do not create a password. In **URL Configuration**, set the site URL to the public menu and add the exact `owner.html` URL as an allowed redirect.
4. Copy `owner-config.example.js` to `owner-config.js` and replace only the project URL and publishable/anon key placeholders. Never put a service-role key there.
5. Copy `.env.example` to a private local environment file and fill the Supabase, Turnstile, Resend and cron values. Keep `PAYMENTS_ENABLED=false` and `CUSTOMER_EMAIL_ENABLED=false`.
6. Add the environment values as Supabase project secrets, then deploy the five functions listed below. The verification modes in `config.toml` are intentional: public forms and the cron callback perform their own checks, while `owner-orders` also requires a valid Supabase access token.
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
supabase functions deploy process-notifications --no-verify-jwt
```

## Payments

Do not deploy `stripe-webhook` or add Stripe secrets for the request-only release. The owner inbox hides payment controls, and the owner API rejects approval/payment-link actions while `PAYMENTS_ENABLED=false`. Stripe support remains in the source tree for a separately tested later phase.

## Resend and the email queue

Use `Coco & Toffee <onboarding@resend.dev>` while testing. Resend permits this sender to email only the address that owns the Resend account, so set `CUSTOMER_EMAIL_ENABLED=false`. Owner alerts are delivered; customer notification jobs are marked `suppressed` instead of repeatedly failing. Reply to customers with the pre-addressed Gmail links in the owner inbox.

After a custom sending domain is owned and verified, change `RESEND_FROM_EMAIL` to that domain and set `CUSTOMER_EMAIL_ENABLED=true` for new customer acknowledgements.

Every saved order/contact and important order status change inserts its email jobs in the same database transaction. `process-notifications` leases ready jobs, retries failures with increasing delays, and recovers a worker lease after five minutes. Run it at least once per minute using Supabase Cron or another scheduler, sending `POST` with the private `x-cron-secret` header. It can also be run manually from the signed-in owner inbox.

Configure an alert for queue rows that remain `failed`, have 10 attempts, or are older than 15 minutes. Email failure does not delete or roll back an order.

## Turnstile, origins, and rate limits

Create a Cloudflare Turnstile site for `ultras0nic.github.io`. Put the public site key in `index.html` and its secret only in Supabase. `TURNSTILE_ALLOWED_HOSTNAMES` is checked after Cloudflare validates the token. `ALLOWED_ORIGINS` should contain only the production origin plus explicit local development origins when needed.

The database-backed rate limiter protects order and contact submission. Leave `TURNSTILE_BYPASS_FOR_LOCAL=false` in production.

## Release verification

Before accepting real orders:

1. Run the backend tests: `node --test supabase/tests/*.test.mjs`.
2. Submit one fixed-price pickup request and one mixed custom-dessert delivery request.
3. Confirm the browser total cannot change the server price.
4. Confirm both requests appear in the owner inbox and its one-click Gmail reply is addressed correctly.
5. Confirm owner alerts arrive and customer notification jobs are `suppressed`, not `failed`.
6. Temporarily use an invalid Resend key, verify the request is still saved, restore the key, and retry the email queue.
7. Confirm a non-owner Supabase account receives `403` from owner functions and cannot read any commerce table directly.
8. Confirm the pickup address is not present in the public page, public configuration, or pre-approval messages.

Leave the public endpoint meta blank if any of these checks fail.
