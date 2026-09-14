-- Moves the notification retry sweep from every minute to every five minutes.
--
-- submit-order already triggers process-notifications directly once an order is
-- accepted, so this schedule is only a safety net for a delivery that failed on
-- that first attempt. Running it every minute cost 43,200 Edge Function
-- invocations per month, about 9% of the free plan's 500,000, to catch a case
-- that is rare. Five minutes costs 8,640 and delays only a retry, never a first
-- notification.
--
-- The job body is unchanged from 202609100002_notification_cron.sql. This
-- migration is idempotent and re-runnable.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-coco-toffee-notifications') then
    perform cron.unschedule('process-coco-toffee-notifications');
  end if;
end;
$$;

select cron.schedule(
  'process-coco-toffee-notifications',
  '*/5 * * * *',
  $job$
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
  ) as request_id;
  $job$
);
