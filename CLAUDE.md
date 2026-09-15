# Coco & Toffee — working notes for Claude

Bakery menu and order-request site for a home bakery in New Bedford, MA (02745).
Owner runs it alone. Everything is on free tiers.

## Stack

| Piece | Role |
|---|---|
| GitHub `Ultras0nic/coco-toffee-menu` | Source. **Public.** Actions minutes unlimited because of that. |
| Cloudflare Pages, project `cocoandtoffee` | Hosts <https://cocoandtoffee.pages.dev>. Builds `main` with `npm run build`, publishes `dist/`. |
| Supabase `syoqhpsjjmkdkgpvrqlz` | Postgres + Edge Functions. Orders, contact, owner inbox, notifications. |
| Resend | Owner and customer email. |
| Telegram `@CocoandToffeeBot` | Owner-only order alerts. |
| Cloudflare Turnstile | Spam check on both forms. |

GitHub Pages is **off** and must stay off. The site moved to Cloudflare in
September 2026. Nothing in the repo publishes to Pages any more.

## Traps that have already caused bugs

**Notifications are queued by a database trigger, not by TypeScript.**
`queue_customer_notifications` in Postgres inserts every `notification_outbox`
row. An earlier change added Telegram to helper functions in
`_shared/notifications.ts` that turned out to be unreachable, so the feature
silently did nothing. Those helpers are now deleted. If you need to change what
gets queued, change the trigger with a new migration.

**Nothing delivers a queued row except `process-notifications`.** Cron sweeps it
every five minutes. `submit-order` and `contact` call `startNotificationWorker()`
after storing a new request so the owner alert goes out within seconds; remove
that and alerts lag by up to five minutes.

**Never slice a Telegram HTML message.** Cutting through a tag or entity makes
Telegram reject it, and the row retries until the attempt cap. Shorten raw
customer text before escaping, as `_shared/telegram.ts` does.

**`data/menu.json` is English only.** `data/locales/{pt-PT,es-ES,zh-Hans}.json`
hold their own copies of every product and category string. Editing menu.json
alone leaves three languages showing the old text, and the tests do not catch
it — they check a translation exists and is non-empty, not that it still
matches. After any copy change, sweep the locale files.

**Prices live in three places that must agree.** `data/menu.json`
`pricing.offers[].priceCents`, the `price` display string, and the offer rows in
`supabase/migrations/202609030002_seed_catalog.sql`. A test asserts the seed
equals the public offers exactly, in order.

**Replacing a photo under the same filename needs `assetVersion` bumped** in
`data/menu.json`, or browsers and the CDN keep serving the old image. Every
photo URL carries `?v=<assetVersion>`.

**Photo filenames must match `/assets/menu/[a-z0-9-]+\.(jpe?g|png|webp)/`** and
should equal the product `id`. Upload names with capitals, spaces or accents
fail the published-asset test.

**A hostname with a trailing dot is a separate origin.** `index.html` and
`owner.html` carry an inline guard at the top of `<head>` that redirects it
away. It must stay before `app.js`; a test asserts the ordering.

## Supabase deploys lag

The GitHub integration has applied migrations late or not at all. Twice now,
code merged to `main` while the database and the Edge Functions stayed days
behind, which looked like broken features rather than stale deploys.

Before debugging any backend behaviour, check what is actually deployed:

```sql
select jobname, schedule from cron.job;
select column_name from information_schema.columns
where table_name = 'notification_outbox';
```

and the last deploy time on Edge Functions → *function* → Overview.

Owner applies migrations and functions from their own machine:

```bash
npx supabase login
npx supabase db push --project-ref syoqhpsjjmkdkgpvrqlz
npx supabase functions deploy --project-ref syoqhpsjjmkdkgpvrqlz
```

Write every migration idempotent and re-runnable, and never edit a released
one — add a new dated file instead, because the old one may already have run.

## What Claude cannot do here

Cloudflare, Supabase and Telegram dashboards are the owner's. The sandbox proxy
also blocks `supabase.co`, `api.telegram.org`, `developers.cloudflare.com` and
`ultras0nic.github.io`, so backend behaviour cannot be verified from a session —
only reasoned about from code and from SQL output the owner pastes back.

Never ask for the Supabase service-role key, Resend key, Turnstile secret, or
the Telegram bot token. The repository is public; those belong in Supabase
secrets only. `owner-config.js` holds public values only.

## Conventions

- `npm test` then `npm run build` before any push. 63 pass, 1 skip is healthy.
  On the owner's machine the private file exists, so the margin audit runs
  instead of skipping, and it currently fails on `coco-double-chocolate/each`.
- The skip is a margin audit needing `commerce-private-setup.json`, which is not
  in the repo and not in CI. **No live price has ever been checked against
  cost.** Cupcakes at $1.25, pastéis at 6/$8 and layer cakes from $70 are the
  ones the owner may want to verify.
- Work on a branch, open a PR, let the `verify` check pass, then merge. `main`
  has a ruleset requiring that check.
- Cloudflare builds every PR as a preview, which spends the 500/month build
  budget. Turning preview deployments off is still on the owner's to-do list,
  along with build watch paths.

## State as of 2026-09-15

Live and working: menu in four languages, order bag, order and contact forms,
Turnstile, owner inbox, Resend email.

Telegram alerts are merged but **not yet live**. Checked from the owner's
machine on 2026-09-15: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set in
Supabase secrets, but migrations `202609140001`, `202609140002` and
`202609150001` were not applied and every Edge Function was still the
2026-09-11 build. Remaining: `db push`, then `functions deploy`, then a test
order. Verify with:

```sql
select channel, status, last_error from notification_outbox
order by created_at desc limit 6;
```

No telegram row means the trigger migration has not run. `suppressed` means the
functions are deployed but the bot secrets are not visible to them.

`process-notifications` has also been returning 503 intermittently — 14 times in
one day, from the `claim_notifications` RPC failing, with a ~6.5 s duration that
suggests a timeout. Not yet diagnosed.
