-- Queues the owner Telegram alert from the notification trigger.
--
-- 202609140002 added the channel column and the Edge Function learned to send
-- on it, but nothing ever inserted a telegram row: orders and contact messages
-- are queued by this trigger, not by the TypeScript helpers in
-- _shared/notifications.ts, which are unreachable. Telegram therefore never
-- fired. This puts the row where the rows are actually made.
--
-- The trigger cannot read Edge Function secrets, so it always queues the row
-- and process-notifications suppresses it when no bot is configured. That is
-- the same shape already used for customer email before domain verification.
--
-- Telegram rows are owner-only. Customers never get one.
-- Replaces the function body from 202609030003_workflow_integrity.sql; the
-- triggers themselves are unchanged and keep pointing at this function.

create or replace function public.queue_customer_notifications() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_event text; v_prefix text;
begin
  if tg_table_name = 'contact_messages' then
    insert into public.notification_outbox(dedupe_key,contact_message_id,recipient,template,channel) values
      ('contact:'||new.id||':owner',new.id,'jericholi334677@gmail.com','owner_contact_received','email'),
      ('contact:'||new.id||':customer',new.id,new.customer_email,'customer_contact_received','email'),
      ('contact:'||new.id||':owner:telegram',new.id,'owner-telegram','owner_contact_received','telegram')
    on conflict(dedupe_key) do nothing;
    return new;
  end if;
  if tg_op = 'INSERT' then v_event := 'received';
  elsif old.status is not distinct from new.status then return new;
  elsif new.status = 'pending_payment' then v_event := 'payment_link';
  elsif new.status = 'confirmed' and new.payment_status = 'paid' then v_event := 'paid';
  elsif new.status in ('declined','changes_requested','payment_expired','cancelled','refunded','fulfilled') then v_event := new.status;
  else return new;
  end if;
  v_prefix := 'order:'||new.id||':'||v_event||':'||new.checkout_revision;
  insert into public.notification_outbox(dedupe_key,order_id,recipient,template,channel) values
    (v_prefix||':owner',new.id,'jericholi334677@gmail.com','owner_order_'||v_event,'email'),
    (v_prefix||':customer',new.id,new.customer_email,'customer_order_'||v_event,'email'),
    (v_prefix||':owner:telegram',new.id,'owner-telegram','owner_order_'||v_event,'telegram')
  on conflict(dedupe_key) do nothing;
  return new;
end; $$;
