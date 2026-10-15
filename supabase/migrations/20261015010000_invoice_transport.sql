-- Optional transport charge, added to the line-item subtotal before tax.

alter table public.invoices
  add column transport numeric(14, 2) not null default 0 check (transport >= 0);
