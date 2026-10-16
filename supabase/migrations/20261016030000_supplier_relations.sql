-- Suppliers get related records instead of flat columns:
--   supplier_contacts  named people at the supplier (the supplier row keeps its switchboard lines and general email)
--   supplier_notes     timestamped notes, newest first, with who wrote them
--   supplier_products  which catalogue products a supplier offers
--   supplier_prices    dated price quotes for a supplier's product (append-only history)
-- Existing contact_name, notes and supplies values are moved into the new tables, then those columns are dropped.

create unique index suppliers_company_key on public.suppliers (lower(company));

-- Contacts ------------------------------------------------------------------------
create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  role text not null default '' check (char_length(role) <= 120),
  phone text not null default '' check (char_length(phone) <= 60),
  email text not null default '' check (char_length(email) <= 254),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supplier_contacts_supplier_idx on public.supplier_contacts (supplier_id);
create unique index supplier_contacts_one_primary on public.supplier_contacts (supplier_id) where is_primary;

create trigger supplier_contacts_set_updated_at before update on public.supplier_contacts
  for each row execute function public.set_updated_at();

-- Notes ---------------------------------------------------------------------------
create table public.supplier_notes (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  author_email text not null default coalesce(auth.jwt() ->> 'email', '') check (char_length(author_email) <= 254),
  created_at timestamptz not null default now()
);

create index supplier_notes_supplier_idx on public.supplier_notes (supplier_id, created_at desc);

-- Products ------------------------------------------------------------------------
-- A product with supplier records cannot be deleted; mark it inactive instead, which keeps its price history.
create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  product_id text not null references public.products (id) on delete restrict,
  available boolean not null default true,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

create index supplier_products_product_idx on public.supplier_products (product_id);

create trigger supplier_products_set_updated_at before update on public.supplier_products
  for each row execute function public.set_updated_at();

-- Prices --------------------------------------------------------------------------
create table public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  supplier_product_id uuid not null references public.supplier_products (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  unit text not null check (unit in ('tonne', 'kg', 'bag')),
  pack_size_kg numeric(10, 3) check (pack_size_kg > 0),
  -- The quote's price tier: the smallest order, in tonnes, this price applies to.
  min_quantity_tonnes numeric(10, 3) not null default 0 check (min_quantity_tonnes >= 0),
  basis text not null default 'ex_works' check (basis in ('ex_works', 'delivered')),
  delivery_location text not null default '' check (char_length(delivery_location) <= 160),
  quoted_on date not null default current_date,
  valid_until date check (valid_until >= quoted_on),
  source text not null default '' check (char_length(source) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  price_per_tonne numeric(14, 2) generated always as (
    round(case unit when 'tonne' then price when 'kg' then price * 1000 else price * 1000 / pack_size_kg end, 2)
  ) stored,
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((unit = 'bag') = (pack_size_kg is not null))
);

create index supplier_prices_product_idx on public.supplier_prices (supplier_product_id, quoted_on desc, created_at desc);

-- Row-level security: admins only, like suppliers ---------------------------------
do $$
declare t text;
begin
  foreach t in array array['supplier_contacts', 'supplier_notes', 'supplier_products', 'supplier_prices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Admins can read %1$s" on public.%1$I for select to authenticated using ((select public.is_admin()))', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- Move existing data --------------------------------------------------------------
insert into public.supplier_contacts (supplier_id, name, phone, email, is_primary)
select id, btrim(contact_name), phone, email, true from public.suppliers where btrim(contact_name) <> '';

insert into public.supplier_notes (supplier_id, body, author_id, author_email, created_at)
select id, btrim(notes), null, '', created_at from public.suppliers where btrim(notes) <> '';

-- Supplies are free text; match them to catalogue products by id, name, search term or the research report's names.
with supplied as (
  select s.id as supplier_id, btrim(item) as item, s.created_at
  from public.suppliers s, unnest(s.supplies) as item
  where btrim(item) <> ''
),
aliases (alias, product_id) as (
  values ('sunflower meal/cake', 'sunflower-meal'), ('sunflower cake', 'sunflower-meal'), ('feed-grade limestone', 'limestone'),
    ('limestone', 'limestone'), ('fishmeal', 'fish-meal'), ('soya meal', 'soybean-meal')
),
matched as (
  select distinct on (supplied.supplier_id, supplied.item) supplied.*, coalesce(a.product_id, p.id) as product_id
  from supplied
  left join aliases a on a.alias = lower(supplied.item)
  left join public.products p on a.product_id is null and (
    lower(p.id) = lower(supplied.item) or lower(p.name) = lower(supplied.item)
    or exists (select 1 from unnest(p.search_terms) term where lower(term) = lower(supplied.item))
  )
  order by supplied.supplier_id, supplied.item, p.id
)
insert into public.supplier_products (supplier_id, product_id, created_at)
select distinct on (supplier_id, product_id) supplier_id, product_id, created_at from matched where product_id is not null
on conflict do nothing;

-- Anything that matched no catalogue product is kept as a note rather than lost.
insert into public.supplier_notes (supplier_id, body, author_id, author_email, created_at)
select s.id, 'Also supplies (not in the product catalogue): ' || string_agg(btrim(item), ', '), null, '', s.created_at
from public.suppliers s, unnest(s.supplies) as item
where btrim(item) <> ''
  and not exists (
    select 1 from public.products p
    where lower(p.id) = lower(btrim(item)) or lower(p.name) = lower(btrim(item))
      or exists (select 1 from unnest(p.search_terms) term where lower(term) = lower(btrim(item)))
  )
  and lower(btrim(item)) not in ('sunflower meal/cake', 'sunflower cake', 'feed-grade limestone', 'limestone', 'fishmeal', 'soya meal')
group by s.id, s.created_at;

alter table public.suppliers drop column contact_name, drop column notes, drop column supplies;
