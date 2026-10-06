-- Add 'Readily available': not held in stock, but sourced at short notice.
alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('In stock', 'Readily available', 'Limited', 'On request'));
