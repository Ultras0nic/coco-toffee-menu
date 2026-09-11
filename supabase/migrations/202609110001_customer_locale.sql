alter table public.orders
  add column if not exists customer_locale text not null default 'en';

alter table public.contact_messages
  add column if not exists customer_locale text not null default 'en';

alter table public.orders drop constraint if exists orders_customer_locale_check;
alter table public.orders add constraint orders_customer_locale_check
  check (customer_locale in ('en', 'pt-PT', 'es-ES', 'zh-Hans'));

alter table public.contact_messages drop constraint if exists contact_messages_customer_locale_check;
alter table public.contact_messages add constraint contact_messages_customer_locale_check
  check (customer_locale in ('en', 'pt-PT', 'es-ES', 'zh-Hans'));

create or replace function public.create_order_request_v2(
  p_idempotency_key text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_fulfillment jsonb,
  p_items jsonb,
  p_notes text,
  p_request_hash text,
  p_customer_locale text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_locale text;
begin
  v_locale := case
    when p_customer_locale in ('en', 'pt-PT', 'es-ES', 'zh-Hans') then p_customer_locale
    else 'en'
  end;

  v_result := public.create_order_request(
    p_idempotency_key,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_fulfillment,
    p_items,
    p_notes,
    p_request_hash
  );

  update public.orders
    set customer_locale = v_locale
    where id = (v_result->>'id')::uuid;

  return v_result;
end;
$$;

revoke all on function public.create_order_request_v2(text, text, text, text, jsonb, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_order_request_v2(text, text, text, text, jsonb, jsonb, text, text, text)
  to service_role;
