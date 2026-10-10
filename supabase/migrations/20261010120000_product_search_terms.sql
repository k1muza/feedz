-- Alternative names customers use to find catalogue products.
-- Search terms are commercial discoverability metadata; they must not change
-- the product's name or its linked technical nutrition ingredient.
alter table public.products
  add column search_terms text[] not null default '{}'::text[];

comment on column public.products.search_terms is
  'Alternative customer search terms and abbreviations. Store lowercase terms; product names and nutrition identities remain unchanged.';

-- Seed synonyms only for the known commercial products. Other products start
-- with an empty array and can have terms added by product administration.
-- Deliberately exclude similar-but-distinct feedstuffs (e.g. maize for sorghum,
-- whole soybeans for soybean meal, or monocalcium phosphate for DCP).
update public.products
set search_terms = case id
  when 'soybean-meal' then array[
    'soya', 'soya meal', 'soyabean', 'soyabean meal',
    'soya bean meal', 'soy meal', 'sbm'
  ]::text[]
  when 'sorghum' then array[
    'sorghum grain', 'mapfunde', 'milo'
  ]::text[]
  when 'wheat-bran' then array[
    'bran', 'millers bran', 'wheat offal'
  ]::text[]
  when 'sunflower-meal' then array[
    'sunflower seed meal', 'sunflower protein meal', 'sfm'
  ]::text[]
  when 'fish-meal' then array[
    'fishmeal', 'fish meal powder'
  ]::text[]
  when 'lysine' then array[
    'lysine hcl', 'l lysine', 'lysine hydrochloride'
  ]::text[]
  when 'methionine' then array[
    'dl methionine', 'dl-met', 'methionine powder'
  ]::text[]
  when 'dcp' then array[
    'dcp', 'di calcium phosphate', 'calcium hydrogen phosphate'
  ]::text[]
  when 'limestone' then array[
    'calcium carbonate', 'ground limestone', 'feed grade calcium carbonate'
  ]::text[]
  else search_terms
end
where id in (
  'soybean-meal', 'sorghum', 'wheat-bran', 'sunflower-meal',
  'fish-meal', 'lysine', 'methionine', 'dcp', 'limestone'
);

-- Supports future server-side array containment/overlap searches.
create index products_search_terms_idx
  on public.products using gin (search_terms);
