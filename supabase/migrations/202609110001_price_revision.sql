-- Applies the direct-customer price revision approved on 2026-09-11.
-- Every product moves to the owner's new per-unit rate and bundle prices.
-- Brownies and blondies switch from a 4-pack to a 6-pack, so the brownie mixed
-- box now fills in sixes. Tiramisu, Portuguese flan, chocoflan and the New
-- York-style cheesecake leave the custom-quote workflow for fixed per-slice and
-- whole-dessert prices, leaving only the two layer cakes on custom quotes.
-- This migration is idempotent so it can safely follow the original catalog seed.

update public.products set pricing_mode = 'fixed'
where id in (
  'classic-tiramisu',
  'traditional-portuguese-flan',
  'chocoflan',
  'new-york-style-cheesecake'
);

insert into public.offers(id, product_id, offer_key, label, quantity_units, amount_cents, sort_order) values
  ('coco-double-chocolate:single', 'coco-double-chocolate', 'single', 'Each', 1, 350, 10),
  ('coco-double-chocolate:6-pack', 'coco-double-chocolate', '6-pack', '6-pack', 6, 2000, 20),
  ('coco-double-chocolate:dozen', 'coco-double-chocolate', 'dozen', 'Dozen', 12, 3900, 30),
  ('toffee-brown-butter-espresso:single', 'toffee-brown-butter-espresso', 'single', 'Each', 1, 350, 10),
  ('toffee-brown-butter-espresso:6-pack', 'toffee-brown-butter-espresso', '6-pack', '6-pack', 6, 2000, 20),
  ('toffee-brown-butter-espresso:dozen', 'toffee-brown-butter-espresso', 'dozen', 'Dozen', 12, 3900, 30),
  ('classic-chocolate-chip:single', 'classic-chocolate-chip', 'single', 'Each', 1, 350, 10),
  ('classic-chocolate-chip:6-pack', 'classic-chocolate-chip', '6-pack', '6-pack', 6, 2000, 20),
  ('classic-chocolate-chip:dozen', 'classic-chocolate-chip', 'dozen', 'Dozen', 12, 3900, 30),
  ('cranberry-white-chocolate-oatmeal:single', 'cranberry-white-chocolate-oatmeal', 'single', 'Each', 1, 350, 10),
  ('cranberry-white-chocolate-oatmeal:6-pack', 'cranberry-white-chocolate-oatmeal', '6-pack', '6-pack', 6, 2000, 20),
  ('cranberry-white-chocolate-oatmeal:dozen', 'cranberry-white-chocolate-oatmeal', 'dozen', 'Dozen', 12, 3900, 30),
  ('white-chocolate-macadamia:single', 'white-chocolate-macadamia', 'single', 'Each', 1, 375, 10),
  ('white-chocolate-macadamia:6-pack', 'white-chocolate-macadamia', '6-pack', '6-pack', 6, 2200, 20),
  ('white-chocolate-macadamia:dozen', 'white-chocolate-macadamia', 'dozen', 'Dozen', 12, 4200, 30),
  ('smores-cookie:single', 'smores-cookie', 'single', 'Each', 1, 350, 10),
  ('smores-cookie:6-pack', 'smores-cookie', '6-pack', '6-pack', 6, 2000, 20),
  ('smores-cookie:dozen', 'smores-cookie', 'dozen', 'Dozen', 12, 3900, 30),
  ('peanut-butter-blossom:single', 'peanut-butter-blossom', 'single', 'Each', 1, 350, 10),
  ('peanut-butter-blossom:6-pack', 'peanut-butter-blossom', '6-pack', '6-pack', 6, 2000, 20),
  ('peanut-butter-blossom:dozen', 'peanut-butter-blossom', 'dozen', 'Dozen', 12, 3900, 30),
  ('classic-fudge-brownie:single', 'classic-fudge-brownie', 'single', 'Each', 1, 300, 10),
  ('classic-fudge-brownie:6-pack', 'classic-fudge-brownie', '6-pack', '6-pack', 6, 1700, 20),
  ('classic-fudge-brownie:dozen', 'classic-fudge-brownie', 'dozen', 'Dozen', 12, 3300, 30),
  ('funfetti-blondie:single', 'funfetti-blondie', 'single', 'Each', 1, 300, 10),
  ('funfetti-blondie:6-pack', 'funfetti-blondie', '6-pack', '6-pack', 6, 1700, 20),
  ('funfetti-blondie:dozen', 'funfetti-blondie', 'dozen', 'Dozen', 12, 3300, 30),
  ('chocolate-chip-jumbo-muffin:single', 'chocolate-chip-jumbo-muffin', 'single', 'Each', 1, 300, 10),
  ('chocolate-chip-jumbo-muffin:6-pack', 'chocolate-chip-jumbo-muffin', '6-pack', '6-pack', 6, 1700, 20),
  ('blueberry-jumbo-muffin:single', 'blueberry-jumbo-muffin', 'single', 'Each', 1, 300, 10),
  ('blueberry-jumbo-muffin:6-pack', 'blueberry-jumbo-muffin', '6-pack', '6-pack', 6, 1700, 20),
  ('coffee-cake-jumbo-muffin:single', 'coffee-cake-jumbo-muffin', 'single', 'Each', 1, 300, 10),
  ('coffee-cake-jumbo-muffin:6-pack', 'coffee-cake-jumbo-muffin', '6-pack', '6-pack', 6, 1700, 20),
  ('jumbo-cinnamon-roll:single', 'jumbo-cinnamon-roll', 'single', 'Each', 1, 450, 10),
  ('jumbo-cinnamon-roll:6-pack', 'jumbo-cinnamon-roll', '6-pack', '6-pack', 6, 2600, 20),
  ('bacon-gruyere-onion-quiche:single', 'bacon-gruyere-onion-quiche', 'single', 'Each', 1, 400, 10),
  ('bacon-gruyere-onion-quiche:6-pack', 'bacon-gruyere-onion-quiche', '6-pack', '6-pack', 6, 2300, 20),
  ('bacon-gruyere-onion-quiche:dozen', 'bacon-gruyere-onion-quiche', 'dozen', 'Dozen', 12, 4500, 30),
  ('assorted-individual-tartlets:assorted-4', 'assorted-individual-tartlets', 'assorted-4', '4-count assortment', 4, 2650, 10),
  ('vanilla-custard-fresh-berry-tartlet:single', 'vanilla-custard-fresh-berry-tartlet', 'single', 'Each', 1, 700, 10),
  ('vanilla-custard-fresh-berry-tartlet:4-pack', 'vanilla-custard-fresh-berry-tartlet', '4-pack', '4-pack', 4, 2650, 20),
  ('lemon-cream-tartlet:single', 'lemon-cream-tartlet', 'single', 'Each', 1, 700, 10),
  ('lemon-cream-tartlet:4-pack', 'lemon-cream-tartlet', '4-pack', '4-pack', 4, 2650, 20),
  ('chocolate-hazelnut-tartlet:single', 'chocolate-hazelnut-tartlet', 'single', 'Each', 1, 700, 10),
  ('chocolate-hazelnut-tartlet:4-pack', 'chocolate-hazelnut-tartlet', '4-pack', '4-pack', 4, 2650, 20),
  ('classic-tiramisu:single', 'classic-tiramisu', 'single', 'Per slice', 1, 700, 10),
  ('classic-tiramisu:whole', 'classic-tiramisu', 'whole', '5-slice pan', 5, 3000, 20),
  ('traditional-portuguese-flan:single', 'traditional-portuguese-flan', 'single', 'Per slice', 1, 450, 10),
  ('traditional-portuguese-flan:whole', 'traditional-portuguese-flan', 'whole', 'Whole flan', 5, 2000, 20),
  ('chocoflan:single', 'chocoflan', 'single', 'Per slice', 1, 500, 10),
  ('chocoflan:whole', 'chocoflan', 'whole', 'Whole dessert', 5, 2500, 20),
  ('new-york-style-cheesecake:single', 'new-york-style-cheesecake', 'single', 'Whole 9-inch cheesecake', 1, 5000, 10),
  ('four-layer-chocolate-cake:quote', 'four-layer-chocolate-cake', 'quote', 'Custom quote', 1, null, 10),
  ('carrot-cake:quote', 'carrot-cake', 'quote', 'Custom quote', 1, null, 10),
  ('classic-vanilla-cupcakes:single', 'classic-vanilla-cupcakes', 'single', 'Each', 1, 125, 10),
  ('classic-vanilla-cupcakes:6-pack', 'classic-vanilla-cupcakes', '6-pack', '6-pack', 6, 700, 20),
  ('classic-vanilla-cupcakes:dozen', 'classic-vanilla-cupcakes', 'dozen', 'Dozen', 12, 1400, 30),
  ('classic-chocolate-cupcakes:single', 'classic-chocolate-cupcakes', 'single', 'Each', 1, 125, 10),
  ('classic-chocolate-cupcakes:6-pack', 'classic-chocolate-cupcakes', '6-pack', '6-pack', 6, 700, 20),
  ('classic-chocolate-cupcakes:dozen', 'classic-chocolate-cupcakes', 'dozen', 'Dozen', 12, 1400, 30),
  ('red-velvet-cupcakes:single', 'red-velvet-cupcakes', 'single', 'Each', 1, 125, 10),
  ('red-velvet-cupcakes:6-pack', 'red-velvet-cupcakes', '6-pack', '6-pack', 6, 700, 20),
  ('red-velvet-cupcakes:dozen', 'red-velvet-cupcakes', 'dozen', 'Dozen', 12, 1400, 30),
  ('carrot-cupcakes:single', 'carrot-cupcakes', 'single', 'Each', 1, 125, 10),
  ('carrot-cupcakes:6-pack', 'carrot-cupcakes', '6-pack', '6-pack', 6, 700, 20),
  ('carrot-cupcakes:dozen', 'carrot-cupcakes', 'dozen', 'Dozen', 12, 1400, 30),
  ('pasteis-de-nata:single', 'pasteis-de-nata', 'single', 'Each', 1, 175, 10),
  ('pasteis-de-nata:6-pack', 'pasteis-de-nata', '6-pack', '6-pack', 6, 800, 20),
  ('pasteis-de-nata:dozen', 'pasteis-de-nata', 'dozen', 'Dozen', 12, 1400, 30)
on conflict (id) do update set
  product_id = excluded.product_id,
  offer_key = excluded.offer_key,
  label = excluded.label,
  quantity_units = excluded.quantity_units,
  amount_cents = excluded.amount_cents,
  sort_order = excluded.sort_order,
  active = true;

-- Retire the offers this revision replaces: the four desserts no longer take
-- custom-quote requests, and brownies and blondies no longer sell in fours.
update public.offers set active = false
where id in (
  'classic-tiramisu:quote',
  'traditional-portuguese-flan:quote',
  'chocoflan:quote',
  'new-york-style-cheesecake:quote',
  'classic-fudge-brownie:4-pack',
  'funfetti-blondie:4-pack'
);
