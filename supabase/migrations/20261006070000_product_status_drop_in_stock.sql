-- Drop 'In stock': FeedSport does not hold inventory, so those lines are sourced at short notice.
alter table public.products drop constraint if exists products_status_check;
update public.products set status = 'Readily available' where status = 'In stock';
alter table public.products
  add constraint products_status_check
  check (status in ('Readily available', 'Limited', 'Available to order'));
