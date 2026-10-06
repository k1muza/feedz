-- Product administration and catalogue seed.
--
-- A product is the commercial wrapper around one stable ingredient ID from
-- src/data/nutrition/ingredients/ingredient-library.json. Nutrient values stay
-- version-controlled in JSON; Supabase owns catalogue, pricing and stock data.

create table public.product_categories (
  id text primary key,
  name text not null unique check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger product_categories_set_updated_at before update on public.product_categories
  for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;

create policy "Anyone can read product categories" on public.product_categories
  for select to anon, authenticated using (true);
create policy "Admins can insert product categories" on public.product_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update product categories" on public.product_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete product categories" on public.product_categories
  for delete to authenticated using ((select public.is_admin()));

insert into public.product_categories (id, name, slug, image_label)
values
  ('protein-feeds', 'Protein feeds', 'protein-feeds', 'soybean / fish meal'),
  ('energy-feeds', 'Energy feeds', 'energy-feeds', 'sorghum'),
  ('fiber-products', 'Fibre products', 'fiber-products', 'wheat bran'),
  ('minerals', 'Minerals', 'minerals', 'DCP / limestone'),
  ('amino-acids', 'Amino acids', 'amino-acids', 'lysine granules'),
  ('premixes-additives', 'Premixes & additives', 'premixes-additives', 'premix bags')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, image_label = excluded.image_label;

alter table public.products
  add column nutrition_ingredient_id text,
  add column category_id text,
  add column status text not null default 'On request' check (status in ('In stock', 'Limited', 'On request')),
  add column animals text[] not null default '{}'
    check (animals <@ array['pigs', 'poultry', 'cattle', 'other']::text[]),
  add column grade_fallback text not null default '',
  add column image_label text not null default '',
  add column origin text not null default '',
  add column active boolean not null default true,
  add column currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  add column price_unit text not null default 'tonne' check (price_unit in ('tonne', 'kg', 'bag', 'unit'));

drop policy "Anyone can read products" on public.products;
create policy "Anyone can read active products" on public.products
  for select to anon, authenticated using (active);
create policy "Admins can read all products" on public.products
  for select to authenticated using ((select public.is_admin()));

-- Migrate the rows inserted by the preceding invoice migration before adding
-- the required relationship constraints.
update public.products
set
  nutrition_ingredient_id = case id
    when 'soybean-meal' then 'soybean-meal-solvent-extracted'
    when 'sorghum' then 'sorghum-grain'
    when 'wheat-bran' then 'wheat-bran'
    when 'sunflower-meal' then 'sunflower-meal-solvent-extracted'
    when 'fish-meal' then 'fish-meal-54'
    when 'lysine' then 'l-lysine-hcl'
    when 'methionine' then 'dl-methionine'
    when 'dcp' then 'dicalcium-phosphate'
    when 'limestone' then 'limestone-ground'
  end,
  category_id = case category
    when 'Protein feeds' then 'protein-feeds'
    when 'Energy feeds' then 'energy-feeds'
    when 'Fibre products' then 'fiber-products'
    when 'Minerals' then 'minerals'
    when 'Amino acids' then 'amino-acids'
    when 'Premixes & additives' then 'premixes-additives'
  end;

-- A generic premix has no ingredient row in the Brazilian Tables. It should
-- be added later only when a supplier-backed JSON profile exists.
delete from public.products where nutrition_ingredient_id is null;

alter table public.products
  alter column nutrition_ingredient_id set not null,
  alter column category_id set not null,
  add constraint products_category_id_fkey foreign key (category_id)
    references public.product_categories (id) on update cascade on delete restrict,
  drop column category;

create index products_category_id_idx on public.products (category_id);
create index products_nutrition_ingredient_id_idx on public.products (nutrition_ingredient_id);
create index products_active_idx on public.products (active) where active;

-- Commercial values are inferred from the existing frontend catalogue. Prices
-- are editable planning defaults in USD/tonne. Stock remains zero until an
-- administrator records a verified physical count.
insert into public.products
  (id, nutrition_ingredient_id, category_id, name, description, status, animals,
   grade_fallback, packaging, price, moq, stock, certifications, images,
   image_label, origin, shipping, featured, active, currency, price_unit)
values
  ('soybean-meal', 'soybean-meal-solvent-extracted', 'protein-feeds', 'Soybean meal', 'Solvent-extracted soybean meal, a concentrated protein source for pig and poultry diets.', 'In stock', array['pigs', 'poultry', 'cattle'], 'Solvent extracted', '50 kg bags or bulk', 580.00, 1, 0, array['Batch specification supplied'], array['/images/products/soybean/soya.webp'], 'soybean meal — macro, top-down', 'Regional suppliers', '', true, true, 'USD', 'tonne'),
  ('sorghum', 'sorghum-grain', 'energy-feeds', 'Sorghum', 'A versatile energy grain for pig, poultry and cattle diets. Supplied whole or milled.', 'In stock', array['pigs', 'poultry', 'cattle'], 'Whole or hammer-milled', '50 kg bags or bulk', 318.70, 5, 0, array['Batch specification supplied'], array['/images/products/corn/corn.webp'], 'sorghum — grain kernels', 'Zimbabwe', '', true, true, 'USD', 'tonne'),
  ('wheat-bran', 'wheat-bran', 'fiber-products', 'Wheat bran', 'Milling by-product with moderate protein and high fibre. Common in sow, ruminant and layer rations.', 'Limited', array['pigs', 'cattle', 'other'], 'Coarse', '40 kg bags', 200.00, 1, 0, array['Batch specification supplied'], array['/images/products/wheat/bran.webp'], 'wheat bran — flakes', 'Zimbabwe', '', false, true, 'USD', 'tonne'),
  ('sunflower-meal', 'sunflower-meal-solvent-extracted', 'protein-feeds', 'Sunflower meal', 'Locally available protein, well suited to cattle diets and partial soybean replacement.', 'In stock', array['cattle', 'pigs', 'other'], 'Solvent extracted', '50 kg bags', 500.00, 1, 0, array['Batch specification supplied'], array['/images/products/sunflower/sunflower.webp'], 'sunflower meal — texture', 'Zimbabwe', '', false, true, 'USD', 'tonne'),
  ('fish-meal', 'fish-meal-54', 'protein-feeds', 'Fish meal', 'Animal protein with a strong amino acid profile, used in piglet and starter diets.', 'On request', array['pigs', 'poultry'], 'Feed grade', '50 kg bags', 0.00, 0.5, 0, array['Supplier dependent'], array['/images/products/fish/fish.webp'], 'fish meal — close-up', 'Selected suppliers', '', false, true, 'USD', 'tonne'),
  ('lysine', 'l-lysine-hcl', 'amino-acids', 'L-Lysine HCl', 'Crystalline lysine used to meet amino acid targets while reducing reliance on intact protein sources.', 'In stock', array['pigs', 'poultry'], 'Crystalline amino acid', '25 kg bags', 1909.51, 0.025, 0, array['Feed grade certificate'], array['/images/products/lysine/lysine.webp'], 'lysine — white granules', 'Selected suppliers', '', false, true, 'USD', 'tonne'),
  ('methionine', 'dl-methionine', 'amino-acids', 'Methionine', 'Crystalline methionine source for balancing amino acid supply in pig and poultry diets.', 'In stock', array['poultry', 'pigs'], 'Crystalline amino acid', '25 kg bags', 2479.00, 0.025, 0, array['Feed grade certificate'], array['/images/products/placeholder.webp'], 'methionine — powder', 'Selected suppliers', '', false, true, 'USD', 'tonne'),
  ('dcp', 'dicalcium-phosphate', 'minerals', 'Dicalcium phosphate', 'Phosphorus and calcium source for bone growth and egg shell quality.', 'In stock', array['pigs', 'poultry', 'cattle'], 'Feed mineral', '50 kg bags', 536.00, 1, 0, array['Batch specification supplied'], array['/images/products/dcp/dcp.webp'], 'DCP — granular', 'Regional suppliers', '', false, true, 'USD', 'tonne'),
  ('limestone', 'limestone-ground', 'minerals', 'Feed limestone', 'Calcium source supplied in fine and coarse grades, including for laying-hen diets.', 'In stock', array['poultry', 'cattle', 'pigs'], 'Fine and coarse', '50 kg bags', 135.00, 1, 0, array['Batch specification supplied'], array['/images/products/bone/bone.webp'], 'limestone — grit', 'Zimbabwe', '', false, true, 'USD', 'tonne')
on conflict (id) do update set
  nutrition_ingredient_id = excluded.nutrition_ingredient_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  animals = excluded.animals,
  grade_fallback = excluded.grade_fallback,
  packaging = excluded.packaging,
  price = excluded.price,
  moq = excluded.moq,
  certifications = excluded.certifications,
  images = excluded.images,
  image_label = excluded.image_label,
  origin = excluded.origin,
  shipping = excluded.shipping,
  featured = excluded.featured,
  active = excluded.active,
  currency = excluded.currency,
  price_unit = excluded.price_unit;
