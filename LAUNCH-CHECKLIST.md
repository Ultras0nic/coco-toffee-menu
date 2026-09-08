# Activate online order sending

The menu, cart, package savings, mixed boxes and email fallback work without paid-service credentials.
Automatic sending and payment are deliberately disabled until the following setup is complete.

1. **Supabase:** create a project, deploy the included migrations and functions, and add the owner
   account `jericholi334677@gmail.com`. Configure the owner page as an allowed sign-in redirect.
2. **Stripe:** activate the business account, begin in test mode, and register the payment webhook.
   Do not switch to live keys until an approved test request successfully becomes a confirmed order.
3. **Cloudflare Turnstile:** register the website hostname and configure the public site key and
   server-only secret. This protects both order and contact forms.
4. **Email:** verify a sending domain with Resend. The recipient remains the owner's Gmail address.
   Until verification is complete, send the generated approval/payment email manually from the inbox.
5. **Private pricing:** configure the server-only quote guide from the local private setup file kept
   outside this public repository. Never paste service secrets or internal costs into public files.
6. **Business readiness:** confirm the kitchen approval, pickup arrangements, delivery availability,
   applicable tax treatment and customer terms before accepting paid orders.
7. **Final test:** submit a test request, review its complete flavor allocation, approve it, pay through
   Stripe test mode, and verify the owner/customer notifications and confirmed status. Test a declined
   request and an expired payment link too.
8. **Enable:** set the public backend URL and Turnstile site key in the storefront, set the owner-page
   public configuration, rebuild, and publish. Keep all secret keys in Supabase's secret settings.

Detailed deployment instructions are in [the backend setup guide](supabase/README.md).

## What customers see before activation

Customers can build and edit their order and see package savings. If automatic sending is unavailable,
the website explicitly says the request has **not** been sent and offers a prefilled email and copyable
summary. It never collects card details or claims a request was received without a server confirmation.
