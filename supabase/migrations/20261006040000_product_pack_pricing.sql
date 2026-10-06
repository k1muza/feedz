-- Products are sold in packs. Store the pack size ("granularity") in kg, the
-- price of one pack, and the minimum order quantity in kg, instead of a price
-- per `price_unit` and an MOQ in tonnes.

alter table public.products
  add column pack_size_kg numeric(12, 3) not null default 1000 check (pack_size_kg > 0);

comment on column public.products.pack_size_kg is 'Smallest quantity sold, in kg (e.g. 50 for a 50 kg bag; 1000 for bulk per tonne).';

-- Read the pack size from the packaging text, e.g. '50 kg bags or bulk' -> 50.
update public.products
set pack_size_kg = coalesce((regexp_match(packaging, '(\d+(?:\.\d+)?)\s*kg', 'i'))[1]::numeric, 1000);

-- Convert the stored price to the price of one pack.
update public.products
set price = round(case price_unit
  when 'tonne' then price * pack_size_kg / 1000
  when 'kg' then price * pack_size_kg
  else price
end, 2);

comment on column public.products.price is 'Price of one pack of pack_size_kg, in currency.';

alter table public.products drop column price_unit;

alter table public.products rename column moq to moq_kg;
update public.products set moq_kg = moq_kg * 1000;
comment on column public.products.moq_kg is 'Minimum order quantity in kg.';
