-- Separate visibility for the public products pages and the PDF catalogue.
-- Both apply only to active products; inactive products stay hidden everywhere.

alter table public.products
  add column show_on_products_page boolean not null default true,
  add column show_in_catalog boolean not null default true;
