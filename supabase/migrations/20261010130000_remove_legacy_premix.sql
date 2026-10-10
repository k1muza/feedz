-- Remove the retired hypothetical FeedSport premix from the product catalogue.
-- An earlier migration deactivated this product and repaired legacy article
-- references. Only delete the exact synthetic product, not supplier-backed
-- premixes (or any future product that reuses the generic ID).
--
-- Invoice line items are stored as JSON snapshots, not foreign-key references
-- to public.products, so historical invoices remain intact.

delete from public.products
where id = 'premix'
  and nutrition_ingredient_id = 'public-premix-salt-additives';
