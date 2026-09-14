-- Adds a delivery channel to the notification outbox so owner alerts can also
-- go to Telegram.
--
-- Telegram rides the existing outbox rather than sending inline from
-- submit-order, so it inherits the dedupe key, the claim lease and the retry
-- backoff that email already uses. A Telegram outage retries instead of being
-- lost, and a retried order cannot alert twice.
--
-- Existing rows are email by definition, which the default covers.
-- This migration is idempotent and re-runnable.

alter table public.notification_outbox
  add column if not exists channel text not null default 'email';

alter table public.notification_outbox
  drop constraint if exists notification_outbox_channel_check;

alter table public.notification_outbox
  add constraint notification_outbox_channel_check
  check (channel in ('email', 'telegram'));

comment on column public.notification_outbox.channel is
  'Delivery transport. email goes through Resend; telegram goes to the owner chat and is never used for customer copies.';

-- The ready-queue index is channel-agnostic on purpose: one worker drains both
-- transports in the same batch.
