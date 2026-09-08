alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'quote_requested','pending_approval','changes_requested','payment_setup_pending','pending_payment',
  'confirmed','fulfilled','declined','cancelled','payment_failed','payment_expired','refunded'
));
alter table public.orders add column checkout_request_hash text;

-- Persistence and email scheduling commit together. Email delivery is deliberately not part of checkout success.
create function public.queue_customer_notifications() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_event text; v_prefix text;
begin
  if tg_table_name = 'contact_messages' then
    insert into public.notification_outbox(dedupe_key,contact_message_id,recipient,template) values
      ('contact:'||new.id||':owner',new.id,'jericholi334677@gmail.com','owner_contact_received'),
      ('contact:'||new.id||':customer',new.id,new.customer_email,'customer_contact_received');
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
  insert into public.notification_outbox(dedupe_key,order_id,recipient,template) values
    (v_prefix||':owner',new.id,'jericholi334677@gmail.com','owner_order_'||v_event),
    (v_prefix||':customer',new.id,new.customer_email,'customer_order_'||v_event)
  on conflict(dedupe_key) do nothing;
  return new;
end; $$;
create trigger order_notifications after insert or update of status on public.orders
for each row execute function public.queue_customer_notifications();
create trigger contact_notifications after insert on public.contact_messages
for each row execute function public.queue_customer_notifications();

create function public.claim_notifications(p_limit integer default 20)
returns setof public.notification_outbox language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.notification_outbox set status='failed',next_attempt_at=now(),last_error='Previous delivery lease expired'
  where status='sending' and claimed_at < now()-interval '5 minutes';
  return query with ready as (
    select id from public.notification_outbox
    where status in ('pending','failed') and next_attempt_at<=now() and attempts<10
    order by created_at for update skip locked limit least(greatest(p_limit,1),20)
  ) update public.notification_outbox n set status='sending',attempts=n.attempts+1,
      claimed_at=now(),claim_token=gen_random_uuid()
    from ready where n.id=ready.id returning n.*;
end; $$;

create function public.prepare_checkout(
  p_order_id uuid,p_actor uuid,p_approval_hash text,p_total_cents integer,p_quote_cents integer,
  p_tax_cents integer,p_delivery_cents integer,p_date date,p_window text,p_note text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.orders%rowtype; v_has_quote boolean;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found' using errcode='P0002'; end if;
  select exists(select 1 from public.order_items where order_id=p_order_id and amount_cents is null) into v_has_quote;
  if v_order.status='pending_payment' and v_order.checkout_url is not null then
    if v_order.checkout_expires_at is not null and v_order.checkout_expires_at<=now() then
      update public.orders set status='payment_expired',payment_status='expired' where id=p_order_id returning * into v_order;
    elsif v_order.checkout_request_hash<>p_approval_hash then
      raise exception 'an active payment link already exists with different approval details' using errcode='23514';
    else
      return to_jsonb(v_order);
    end if;
  end if;
  if v_order.status='payment_setup_pending' then
    if v_order.checkout_request_hash<>p_approval_hash then
      raise exception 'retry the existing checkout preparation without changing approval details' using errcode='23514';
    end if;
    return to_jsonb(v_order);
  end if;
  if v_order.status not in ('quote_requested','pending_approval','changes_requested','payment_failed','payment_expired') then
    raise exception 'order is not approvable' using errcode='23514';
  end if;
  if p_total_cents<100 or p_total_cents>1000000 or p_tax_cents<0 or p_delivery_cents<0
     or p_date<(now() at time zone 'America/New_York')::date + case when v_has_quote then 7 else 3 end
     or length(trim(p_window))<1 then
    raise exception 'invalid approval details' using errcode='22023';
  end if;
  if (v_has_quote and (p_quote_cents is null or p_quote_cents<v_order.subtotal_cents))
     or (not v_has_quote and p_quote_cents is not null)
     or p_total_cents<>coalesce(p_quote_cents,v_order.subtotal_cents)+p_tax_cents+p_delivery_cents then
    raise exception 'approved total does not reconcile' using errcode='22023';
  end if;
  update public.orders set status='payment_setup_pending',payment_status='not_requested',
    total_cents=p_total_cents,quoted_total_cents=p_quote_cents,tax_cents=p_tax_cents,delivery_cents=p_delivery_cents,
    approved_date=p_date,approved_window=p_window,owner_note=p_note,approved_by=p_actor,approved_at=now(),
    checkout_revision=checkout_revision+1,checkout_request_hash=p_approval_hash,
    stripe_checkout_session_id=null,checkout_url=null,checkout_expires_at=null
  where id=p_order_id returning * into v_order;
  return to_jsonb(v_order);
end; $$;

create function public.complete_checkout(p_order_id uuid,p_revision integer,p_session_id text,p_url text,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'order not found' using errcode='P0002'; end if;
  if v_order.checkout_revision<>p_revision then raise exception 'checkout revision changed' using errcode='23514'; end if;
  if v_order.status='pending_payment' and v_order.stripe_checkout_session_id=p_session_id then return to_jsonb(v_order); end if;
  if v_order.status<>'payment_setup_pending' then raise exception 'checkout state changed' using errcode='23514'; end if;
  if length(trim(p_session_id))<5 or p_url !~ '^https://checkout\.stripe\.com/'
     or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '25 hours' then
    raise exception 'checkout response is invalid' using errcode='22023';
  end if;
  update public.orders set status='pending_payment',payment_status='pending',stripe_checkout_session_id=p_session_id,
    checkout_url=p_url,checkout_expires_at=p_expires_at where id=p_order_id returning * into v_order;
  insert into public.audit_events(actor_email,action,order_id,metadata)
  values ('jericholi334677@gmail.com','checkout_ready',p_order_id,jsonb_build_object('revision',p_revision));
  return to_jsonb(v_order);
end; $$;

create function public.apply_stripe_event(
  p_event_id text,p_event_type text,p_payload_sha256 text,p_order_id uuid,p_session_id text,
  p_payment_intent_id text,p_target_status text,p_amount_cents integer,p_currency text,p_paid boolean
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.orders%rowtype; v_existing_hash text;
begin
  if length(trim(p_event_id))<3 or length(trim(p_event_type))<3 or p_payload_sha256 !~ '^[0-9a-f]{64}$'
     or p_target_status not in ('paid','failed','expired','refunded') then
    raise exception 'invalid provider event' using errcode='22023';
  end if;
  insert into public.provider_events(provider,event_id,event_type,payload_sha256)
  values ('stripe',p_event_id,p_event_type,p_payload_sha256) on conflict do nothing;
  if not found then
    select payload_sha256 into v_existing_hash from public.provider_events where provider='stripe' and event_id=p_event_id;
    if v_existing_hash is distinct from p_payload_sha256 then
      raise exception 'provider event id was reused with different content' using errcode='23514';
    end if;
    return jsonb_build_object('processed',false,'duplicate',true);
  end if;
  if p_target_status='refunded' then
    select * into v_order from public.orders
    where (p_payment_intent_id is not null and stripe_payment_intent_id=p_payment_intent_id)
       or (p_order_id is not null and id=p_order_id)
    order by case when stripe_payment_intent_id=p_payment_intent_id then 0 else 1 end
    limit 1 for update;
  else
    select * into v_order from public.orders where id=p_order_id for update;
  end if;
  if not found then return jsonb_build_object('processed',true,'ignored',true); end if;
  if p_target_status<>'refunded' and v_order.stripe_checkout_session_id is null
     and v_order.status='payment_setup_pending' then
    raise exception 'checkout session has not committed yet; retry event' using errcode='40001';
  end if;
  if p_target_status<>'refunded' and v_order.stripe_checkout_session_id is distinct from p_session_id then
    return jsonb_build_object('processed',true,'ignored',true,'reason','stale checkout revision');
  end if;
  if p_currency is distinct from v_order.currency then raise exception 'payment currency mismatch' using errcode='23514'; end if;
  if p_target_status='paid' then
    if not p_paid or p_amount_cents is distinct from v_order.total_cents then
      raise exception 'payment status or amount mismatch' using errcode='23514';
    end if;
    if p_payment_intent_id is null then raise exception 'payment intent is missing' using errcode='22023'; end if;
    if v_order.stripe_payment_intent_id is not null and v_order.stripe_payment_intent_id<>p_payment_intent_id then
      raise exception 'payment intent mismatch' using errcode='23514';
    end if;
    if v_order.payment_status not in ('refunded','partially_refunded') then
      update public.orders set status=case when status='fulfilled' then 'fulfilled' else 'confirmed' end,
        payment_status='paid',stripe_payment_intent_id=p_payment_intent_id,
        paid_at=coalesce(paid_at,now()) where id=v_order.id returning * into v_order;
    end if;
  elsif p_target_status='expired' and v_order.payment_status not in ('paid','partially_refunded','refunded') then
    update public.orders set status='payment_expired',payment_status='expired' where id=v_order.id returning * into v_order;
  elsif p_target_status='failed' and v_order.payment_status not in ('paid','partially_refunded','refunded') then
    update public.orders set status='payment_failed',payment_status='failed' where id=v_order.id returning * into v_order;
  elsif p_target_status='refunded' then
    if p_payment_intent_id is null then raise exception 'refund payment intent is missing' using errcode='22023'; end if;
    if v_order.stripe_payment_intent_id is not null and v_order.stripe_payment_intent_id<>p_payment_intent_id then
      raise exception 'refund payment intent mismatch' using errcode='23514';
    end if;
    if p_amount_cents<0 or p_amount_cents>v_order.total_cents then raise exception 'refund amount mismatch' using errcode='23514'; end if;
    if p_amount_cents>v_order.refunded_cents then
      update public.orders set refunded_cents=p_amount_cents,stripe_payment_intent_id=coalesce(stripe_payment_intent_id,p_payment_intent_id),
        payment_status=case when p_amount_cents=total_cents then 'refunded' else 'partially_refunded' end,
        status=case when p_amount_cents=total_cents then 'refunded' else status end
      where id=v_order.id returning * into v_order;
    end if;
  end if;
  return jsonb_build_object('processed',true,'orderId',v_order.id,'status',v_order.status);
end; $$;

revoke all on function public.queue_customer_notifications() from public,anon,authenticated;
revoke all on function public.claim_notifications(integer) from public,anon,authenticated;
revoke all on function public.prepare_checkout(uuid,uuid,text,integer,integer,integer,integer,date,text,text) from public,anon,authenticated;
revoke all on function public.complete_checkout(uuid,integer,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.apply_stripe_event(text,text,text,uuid,text,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
grant execute on function public.prepare_checkout(uuid,uuid,text,integer,integer,integer,integer,date,text,text) to service_role;
grant execute on function public.complete_checkout(uuid,integer,text,text,timestamptz) to service_role;
grant execute on function public.apply_stripe_event(text,text,text,uuid,text,text,text,integer,text,boolean) to service_role;
