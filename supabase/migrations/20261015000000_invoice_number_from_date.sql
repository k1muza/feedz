-- Derive invoice numbers from the issue date: INV-YYYYMMDD-NN, where NN counts
-- invoices issued on that date. Moving an invoice to another issue date gives
-- it the next number for the new date. Existing numbers are left unchanged.

alter table public.invoices alter column invoice_number drop default;
drop sequence public.invoice_number_seq;

create function public.assign_invoice_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prefix text := 'INV-' || to_char(new.issue_date, 'YYYYMMDD') || '-';
  next_seq integer;
begin
  if tg_op = 'UPDATE' and starts_with(old.invoice_number, prefix) then
    new.invoice_number := old.invoice_number;
    return new;
  end if;

  -- Serialise numbering per issue date so concurrent inserts cannot collide.
  perform pg_advisory_xact_lock(hashtext('public.invoices.invoice_number'), new.issue_date - date '2000-01-01');

  select coalesce(max(substring(invoice_number from char_length(prefix) + 1)::integer), 0) + 1
    into next_seq
    from public.invoices
    where invoice_number ~ ('^' || prefix || '[0-9]+$')
      and id <> new.id;

  new.invoice_number := prefix || lpad(next_seq::text, 2, '0');
  return new;
end;
$$;

create trigger invoices_assign_number before insert or update of issue_date, invoice_number on public.invoices
  for each row execute function public.assign_invoice_number();
