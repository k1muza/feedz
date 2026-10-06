-- Rename the 'On request' availability status to 'Available to order'.
alter table public.products drop constraint if exists products_status_check;
update public.products set status = 'Available to order' where status = 'On request';
alter table public.products
  alter column status set default 'Available to order',
  add constraint products_status_check
  check (status in ('In stock', 'Readily available', 'Limited', 'Available to order'));
