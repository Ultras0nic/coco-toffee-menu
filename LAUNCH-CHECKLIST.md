# Activate online order sending

The menu, cart, package savings, mixed boxes and email fallback work without paid-service credentials.
This checklist activates direct request sending without activating online payment.

1. **Supabase:** create a project, deploy the included migrations and functions, and add the owner
   account `jericholi334677@gmail.com`. Configure the owner page as an allowed sign-in redirect.
2. **Cloudflare Turnstile:** register the website hostname and configure the public site key and
   server-only secret. This protects both order and contact forms.
3. **Email:** create a Resend API key and use `Coco & Toffee <onboarding@resend.dev>`. This test sender
   alerts only the Resend account owner. Keep customer email disabled and reply manually from Gmail.
4. **Business readiness:** confirm the kitchen approval, pickup arrangements, delivery availability,
   applicable tax treatment and customer terms before accepting orders.
5. **Final test:** submit one contact message and one order request. Confirm both appear in the private
   inbox, the owner alert arrives, the customer-copy jobs are suppressed, and Gmail reply links work.
6. **Enable:** set the public backend URL and Turnstile site key in the storefront, set the owner-page
   public configuration, rebuild, and publish. Keep all secret keys in Supabase's secret settings.
7. **Optional order texts:** put the public business phone number in the storefront's `sms-recipient`
   meta tag using E.164 format. Leave it blank if customers should choose a recipient themselves.

Stripe is a later phase. Keep `PAYMENTS_ENABLED=false` and do not deploy `stripe-webhook` for this release.

Detailed deployment instructions are in [the backend setup guide](supabase/README.md).

## What customers see before activation

Customers can build and edit their order and see package savings. If automatic sending is unavailable,
the website explicitly says the request has **not** been sent and offers a prefilled email and copyable
summary. It never collects card details or claims a request was received without a server confirmation.
