-- Returns the New York-style cheesecake to the custom-quote workflow.
-- The 2026-09-11 revision briefly sold it at a fixed $50; the owner has since
-- set it back to a quote starting at $45, so this reverses that one product
-- without touching the rest of that revision. The two layer cakes stay on
-- custom quotes and only their public starting prices change, which is display
-- text in data/menu.json rather than catalog data.
-- This migration is idempotent so it can safely follow the price revision.

update public.products set pricing_mode = 'quote'
where id = 'new-york-style-cheesecake';

insert into public.offers(id, product_id, offer_key, label, quantity_units, amount_cents, sort_order) values
  ('new-york-style-cheesecake:quote', 'new-york-style-cheesecake', 'quote', 'Custom quote', 1, null, 10)
on conflict (id) do update set
  product_id = excluded.product_id,
  offer_key = excluded.offer_key,
  label = excluded.label,
  quantity_units = excluded.quantity_units,
  amount_cents = excluded.amount_cents,
  sort_order = excluded.sort_order,
  active = true;

-- Retire the fixed whole-cheesecake offer the price revision introduced.
update public.offers set active = false
where id = 'new-york-style-cheesecake:single';
