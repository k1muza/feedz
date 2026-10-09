-- The retired 10 kg/t FeedSport premix has no real supplier specification.
-- Do not keep advertising its former invented price or availability.
update public.products
set active = false,
    featured = false,
    description = 'Retired hypothetical premix; use manufacturer-identified products with verified specifications instead.'
where id = 'premix' and nutrition_ingredient_id = 'public-premix-salt-additives';
