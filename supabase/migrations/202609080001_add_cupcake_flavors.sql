-- Adds the direct-customer cupcake flavors introduced on 2026-09-08.
-- This migration is idempotent so it can safely follow the original catalog seed.

insert into public.products(id, name, pricing_mode, sort_order) values
  ('classic-chocolate-cupcakes', 'Classic Chocolate Cupcakes', 'fixed', 260),
  ('red-velvet-cupcakes', 'Red Velvet Cupcakes', 'fixed', 270),
  ('carrot-cupcakes', 'Carrot Cupcakes', 'fixed', 280)
on conflict (id) do update set
  name = excluded.name,
  pricing_mode = excluded.pricing_mode,
  mix_group = null,
  sort_order = excluded.sort_order,
  active = true;

update public.products
set sort_order = 290
where id = 'pasteis-de-nata';

insert into public.offers(id, product_id, offer_key, label, quantity_units, amount_cents, sort_order) values
  ('classic-chocolate-cupcakes:single', 'classic-chocolate-cupcakes', 'single', 'Each', 1, 650, 10),
  ('classic-chocolate-cupcakes:6-pack', 'classic-chocolate-cupcakes', '6-pack', '6-pack', 6, 3700, 20),
  ('classic-chocolate-cupcakes:dozen', 'classic-chocolate-cupcakes', 'dozen', 'Dozen', 12, 7200, 30),
  ('red-velvet-cupcakes:single', 'red-velvet-cupcakes', 'single', 'Each', 1, 700, 10),
  ('red-velvet-cupcakes:6-pack', 'red-velvet-cupcakes', '6-pack', '6-pack', 6, 4000, 20),
  ('red-velvet-cupcakes:dozen', 'red-velvet-cupcakes', 'dozen', 'Dozen', 12, 7800, 30),
  ('carrot-cupcakes:single', 'carrot-cupcakes', 'single', 'Each', 1, 700, 10),
  ('carrot-cupcakes:6-pack', 'carrot-cupcakes', '6-pack', '6-pack', 6, 4000, 20),
  ('carrot-cupcakes:dozen', 'carrot-cupcakes', 'dozen', 'Dozen', 12, 7800, 30)
on conflict (id) do update set
  product_id = excluded.product_id,
  offer_key = excluded.offer_key,
  label = excluded.label,
  quantity_units = excluded.quantity_units,
  amount_cents = excluded.amount_cents,
  sort_order = excluded.sort_order,
  active = true;
