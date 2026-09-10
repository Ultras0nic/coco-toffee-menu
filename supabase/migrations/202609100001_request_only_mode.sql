-- Customer copies are intentionally held until Coco & Toffee owns and verifies
-- an email-sending domain. Owner alerts can use Resend's onboarding sender.
alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;

alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'suppressed'));

comment on column public.notification_outbox.status is
  'Delivery state. suppressed means intentionally not sent, such as customer mail before domain verification.';
