create extension if not exists pgcrypto;

create table public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  pricing_mode text not null check (pricing_mode in ('fixed', 'quote', 'builder')),
  mix_group text check (mix_group in ('cookies', 'brownies-blondies', 'muffins', 'tartlets')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id text primary key check (id ~ '^[a-z0-9-]+:(single|4-pack|6-pack|dozen|assorted-4|quote)$'),
  product_id text not null references public.products(id) on delete cascade,
  offer_key text not null,
  label text not null,
  quantity_units integer not null check (quantity_units > 0),
  amount_cents integer check (amount_cents is null or amount_cents > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, offer_key),
  check (
    (offer_key = 'quote' and amount_cents is null)
    or (offer_key <> 'quote' and amount_cents is not null)
  )
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  idempotency_key text not null unique,
  request_hash text not null,
  request_type text not null default 'order' check (request_type = 'order'),
  status text not null check (status in (
    'quote_requested', 'pending_approval', 'changes_requested', 'pending_payment',
    'confirmed', 'fulfilled', 'declined', 'cancelled', 'payment_failed', 'payment_expired', 'refunded'
  )),
  payment_status text not null default 'not_requested' check (payment_status in ('not_requested', 'pending', 'paid', 'failed', 'expired', 'partially_refunded', 'refunded')),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  checkout_revision integer not null default 0,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  fulfillment jsonb not null default '{}'::jsonb,
  notes text,
  currency text not null default 'usd' check (currency = lower(currency) and length(currency) = 3),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  quoted_total_cents integer check (quoted_total_cents is null or quoted_total_cents > 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  delivery_cents integer not null default 0 check (delivery_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  checkout_url text,
  checkout_expires_at timestamptz,
  owner_note text,
  approved_date date,
  approved_window text,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_customer_email_idx on public.orders(lower(customer_email));

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  request_line_index integer not null check (request_line_index >= 0),
  product_id text not null,
  product_name text not null,
  offer_id text not null,
  offer_label text not null,
  offer_quantity_units integer not null check (offer_quantity_units > 0),
  pack_quantity integer not null check (pack_quantity > 0),
  amount_cents integer,
  line_total_cents integer,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items(order_id);

create table public.order_item_components (
  id bigint generated always as identity primary key,
  order_item_id bigint not null references public.order_items(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  units_per_box integer not null check (units_per_box > 0),
  total_units integer not null check (total_units > 0),
  created_at timestamptz not null default now()
);

create index order_item_components_item_idx on public.order_item_components(order_item_id);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  idempotency_key text not null unique,
  request_hash text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  order_id uuid references public.orders(id) on delete cascade,
  contact_message_id uuid references public.contact_messages(id) on delete cascade,
  recipient text not null,
  template text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  claimed_at timestamptz,
  claim_token uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check ((order_id is not null)::integer + (contact_message_id is not null)::integer = 1)
);

create index notification_outbox_ready_idx
  on public.notification_outbox(status, next_attempt_at)
  where status in ('pending', 'failed');

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_email text,
  action text not null,
  order_id uuid references public.orders(id) on delete set null,
  contact_message_id uuid references public.contact_messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger offers_updated_at before update on public.offers
for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger contact_messages_updated_at before update on public.contact_messages
for each row execute function public.set_updated_at();

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_bucket_key) > 200 then
    return false;
  end if;

  insert into public.rate_limit_buckets(bucket_key, window_started_at, request_count)
  values (p_bucket_key, v_now, 1)
  on conflict (bucket_key) do update
    set window_started_at = case
          when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then v_now else public.rate_limit_buckets.window_started_at end,
        request_count = case
          when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then 1 else public.rate_limit_buckets.request_count + 1 end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function public.create_order_request(
  p_idempotency_key text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_fulfillment jsonb,
  p_items jsonb,
  p_notes text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_item_count integer;
  v_valid_count integer;
  v_subtotal integer;
  v_has_quote boolean;
  v_requested_date date;
begin
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_hash <> p_request_hash then
      raise exception 'idempotency key was used with different content' using errcode = '23514';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'publicCode', v_existing.public_code,
      'status', v_existing.status,
      'duplicate', true
    );
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be an array' using errcode = '22023';
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 50 then
    raise exception 'items must contain between 1 and 50 entries' using errcode = '22023';
  end if;

  if p_fulfillment->>'type' not in ('pickup', 'delivery')
     or not (p_fulfillment @> '{"allergyAcknowledged": true}'::jsonb)
     or coalesce(p_fulfillment->>'requestedDate', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'fulfillment details are invalid' using errcode = '22023';
  end if;
  v_requested_date := (p_fulfillment->>'requestedDate')::date;
  if v_requested_date < (now() at time zone 'America/New_York')::date + 3 then
    raise exception 'requested date must allow at least three days lead time' using errcode = '22023';
  end if;
  if p_fulfillment->>'type' = 'delivery' and not (
    p_fulfillment ? 'address'
    and coalesce(p_fulfillment->'address'->>'line1', '') <> ''
    and coalesce(p_fulfillment->'address'->>'city', '') <> ''
    and coalesce(p_fulfillment->'address'->>'state', '') <> ''
    and coalesce(p_fulfillment->'address'->>'postalCode', '') <> ''
  ) then
    raise exception 'delivery address is required' using errcode = '22023';
  end if;

  select count(*),
         count(p.id),
         coalesce(sum(coalesce((x.value->>'amountCents')::integer, 0) * (x.value->>'quantity')::integer), 0)::integer,
         coalesce(bool_or(p.pricing_mode = 'quote' or o.amount_cents is null), false)
    into v_item_count, v_valid_count, v_subtotal, v_has_quote
  from jsonb_array_elements(p_items) as x(value)
  left join public.offers o on o.id = x.value->>'offerId' and o.active
  left join public.products p on p.id = o.product_id and p.active
  where (x.value->>'quantity')::integer between 1 and 20;

  if v_valid_count <> jsonb_array_length(p_items) then
    raise exception 'one or more offers are invalid, inactive, or have an invalid quantity' using errcode = '22023';
  end if;
  if v_has_quote and v_requested_date < (now() at time zone 'America/New_York')::date + 7 then
    raise exception 'custom quote requests require at least seven days lead time' using errcode = '22023';
  end if;

  insert into public.orders(
    idempotency_key, request_hash, status, customer_name, customer_email, customer_phone,
    fulfillment, notes, subtotal_cents, total_cents
  ) values (
    p_idempotency_key,
    p_request_hash,
    case when v_has_quote then 'quote_requested' else 'pending_approval' end,
    trim(p_customer_name), lower(trim(p_customer_email)), nullif(trim(p_customer_phone), ''),
    coalesce(p_fulfillment, '{}'::jsonb), nullif(trim(p_notes), ''),
    v_subtotal, v_subtotal
  ) returning * into v_order;

  insert into public.order_items(
    order_id, request_line_index, product_id, product_name, offer_id, offer_label,
    offer_quantity_units, pack_quantity, amount_cents, line_total_cents
  )
  select v_order.id, (x.ordinality - 1)::integer, p.id, p.name, o.id, o.label,
         o.quantity_units, (x.value->>'quantity')::integer, (x.value->>'amountCents')::integer,
         case when x.value->>'amountCents' is null then null
              else (x.value->>'amountCents')::integer * (x.value->>'quantity')::integer end
  from jsonb_array_elements(p_items) with ordinality as x(value, ordinality)
  join public.offers o on o.id = x.value->>'offerId' and o.active
  join public.products p on p.id = o.product_id and p.active;

  insert into public.order_item_components(order_item_id, product_id, product_name, units_per_box, total_units)
  select oi.id, component_product.id, component_product.name,
         (component.value->>'units')::integer,
         (component.value->>'units')::integer * (item.value->>'quantity')::integer
  from jsonb_array_elements(p_items) with ordinality as item(value, ordinality)
  join public.order_items oi on oi.order_id = v_order.id and oi.request_line_index = item.ordinality - 1
  cross join lateral jsonb_array_elements(coalesce(item.value->'components', '[]'::jsonb)) as component(value)
  join public.products component_product on component_product.id = component.value->>'productId';

  return jsonb_build_object(
    'id', v_order.id,
    'publicCode', v_order.public_code,
    'status', v_order.status,
    'duplicate', false
  );
exception
  when unique_violation then
    select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
    if not found then raise; end if;
    if v_existing.request_hash <> p_request_hash then
      raise exception 'idempotency key was used with different content' using errcode = '23514';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'publicCode', v_existing.public_code,
      'status', v_existing.status,
      'duplicate', true
    );
end;
$$;

alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_components enable row level security;
alter table public.contact_messages enable row level security;
alter table public.provider_events enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limit_buckets enable row level security;

revoke all on public.products,public.offers,public.orders,public.order_items,public.order_item_components,
  public.contact_messages,public.provider_events,public.notification_outbox,public.audit_events,public.rate_limit_buckets
  from anon, authenticated;
revoke all on sequence public.order_items_id_seq,public.order_item_components_id_seq,
  public.notification_outbox_id_seq,public.audit_events_id_seq from anon,authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_order_request(text, text, text, text, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_order_request(text, text, text, text, jsonb, jsonb, text, text) to service_role;
