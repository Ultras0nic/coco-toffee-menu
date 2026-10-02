-- Adds a Telegram reminder only when a new order has not been viewed or acted
-- on within three minutes. The worker runs once per minute but calls the Edge
-- Function only when a notification is actually due, keeping idle usage low.

alter table public.orders
  add column if not exists owner_acknowledged_at timestamptz;

comment on column public.orders.owner_acknowledged_at is
  'First time the owner inbox viewed or acted on this order.';

create or replace function public.queue_order_unacknowledged_reminder()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notification_outbox(
    dedupe_key, order_id, recipient, template, channel, next_attempt_at
  ) values (
    'order:' || new.id || ':owner:telegram:unacknowledged',
    new.id,
    'owner-telegram',
    'owner_order_unacknowledged',
    'telegram',
    now() + interval '3 minutes'
  ) on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'order_unacknowledged_reminder'
      and tgrelid = 'public.orders'::regclass
      and not tgisinternal
  ) then
    create trigger order_unacknowledged_reminder
    after insert on public.orders
    for each row execute function public.queue_order_unacknowledged_reminder();
  end if;
end;
$$;

do $migration$
declare
  v_job_id bigint;
  v_command text := $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'coco_project_url')
      || '/functions/v1/process-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'coco_publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'coco_notification_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id
  where exists (
    select 1
    from public.notification_outbox
    where status in ('pending', 'failed')
      and attempts < 10
      and next_attempt_at <= now()
  );
  $job$;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'process-coco-toffee-notifications';

  if v_job_id is null then
    perform cron.schedule('process-coco-toffee-notifications', '* * * * *', v_command);
  else
    perform cron.alter_job(v_job_id, schedule => '* * * * *', command => v_command, active => true);
  end if;
end;
$migration$;
