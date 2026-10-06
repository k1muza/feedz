-- Vitamin-mineral premix used at a fixed 10 kg/t by the formulation tool.
-- It has no Brazilian Tables record, so it links to the formulation premix ID;
-- its price is the planning price the formulation tool uses for the premix.
insert into public.products
  (id, nutrition_ingredient_id, category_id, name, description, status, animals,
   grade_fallback, packaging, pack_size_kg, price, currency, moq_kg, stock,
   certifications, images, image_label, origin, shipping, featured, active)
values
  ('premix', 'public-premix-salt-additives', 'premixes-additives', 'Vitamin-mineral premix (10 kg/t)',
   'Vitamin and trace-mineral premix included at 10 kg per tonne of finished feed, matched to the species and production stage.',
   'Available to order', array['pigs', 'poultry', 'cattle'], 'Per species and stage', '20 kg bags', 20, 40.00, 'USD', 20, 0,
   array['Supplier dependent'], array['/images/products/placeholder.webp'], 'premix — bag', 'Selected manufacturers', '', false, true)
on conflict (id) do update set
  nutrition_ingredient_id = excluded.nutrition_ingredient_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  packaging = excluded.packaging,
  pack_size_kg = excluded.pack_size_kg,
  price = excluded.price,
  currency = excluded.currency,
  moq_kg = excluded.moq_kg,
  active = excluded.active;
