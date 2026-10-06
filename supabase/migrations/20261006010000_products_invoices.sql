-- Saleable products and invoices.
-- Invoice line items are JSON snapshots so historical invoices keep the
-- description and price that applied when they were issued.

create sequence public.invoice_number_seq start with 1;
grant usage on sequence public.invoice_number_seq to authenticated;

create table public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 160),
  category text not null default '',
  description text not null default '',
  packaging text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  moq numeric(12, 3) not null default 0 check (moq >= 0),
  stock numeric(12, 3) not null default 0 check (stock >= 0),
  certifications text[] not null default '{}',
  images text[] not null default '{}',
  shipping text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy "Anyone can read products" on public.products
  for select to anon, authenticated using (true);
create policy "Admins can insert products" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update products" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete products" on public.products
  for delete to authenticated using ((select public.is_admin()));

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default (
    'INV-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0')
  ),
  issue_date date not null default current_date,
  due_date date not null,
  client jsonb not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  tax_rate numeric(7, 6) not null default 0 check (tax_rate between 0 and 1),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  notes text not null default '',
  payment_terms text not null default '',
  bank jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= issue_date)
);

create index invoices_issue_date_idx on public.invoices (issue_date desc, created_at desc);
create index invoices_status_idx on public.invoices (status);
create index invoices_client_name_idx on public.invoices (lower(client ->> 'name'));

create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

create policy "Admins can read invoices" on public.invoices
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can insert invoices" on public.invoices
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update invoices" on public.invoices
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete invoices" on public.invoices
  for delete to authenticated using ((select public.is_admin()));

-- Editable planning defaults in USD per tonne. An administrator can change the
-- price while preparing an invoice; the chosen value is saved on that invoice.
insert into public.products
  (id, name, category, description, packaging, price, moq, stock, certifications, images, featured)
values
  ('soybean-meal', 'Soybean meal', 'Protein feeds', 'Solvent-extracted soybean meal for pig and poultry diets.', '50 kg bags or bulk', 580.00, 1, 0, array['Batch specification supplied'], array['/images/products/soybean/soya.png'], true),
  ('sorghum', 'Sorghum', 'Energy feeds', 'Whole or hammer-milled energy grain.', '50 kg bags or bulk', 318.70, 5, 0, array['Batch specification supplied'], array['/images/products/corn/corn.png'], true),
  ('wheat-bran', 'Wheat bran', 'Fibre products', 'Milling by-product for sow and ruminant rations.', '40 kg bags', 200.00, 1, 0, array['Batch specification supplied'], array['/images/products/wheat/bran.png'], false),
  ('sunflower-meal', 'Sunflower meal', 'Protein feeds', 'Locally available protein feed.', '50 kg bags', 500.00, 1, 0, array['Batch specification supplied'], array['/images/products/sunflower/sunflower.png'], false),
  ('fish-meal', 'Fish meal', 'Protein feeds', 'Feed-grade animal protein.', '50 kg bags', 0.00, 0.5, 0, array[]::text[], array['/images/products/fish/fish.png'], false),
  ('lysine', 'L-Lysine HCl', 'Amino acids', 'Crystalline feed-grade lysine.', '25 kg bags', 1909.51, 0.025, 0, array['Feed grade certificate'], array['/images/products/lysine/lysine.png'], false),
  ('methionine', 'Methionine', 'Amino acids', 'Crystalline feed-grade methionine.', '25 kg bags', 2479.00, 0.025, 0, array['Feed grade certificate'], array['/images/products/placeholder.png'], false),
  ('dcp', 'Dicalcium phosphate', 'Minerals', 'Phosphorus and calcium source.', '50 kg bags', 536.00, 1, 0, array['Batch specification supplied'], array['/images/products/dcp/dcp.png'], false),
  ('limestone', 'Feed limestone', 'Minerals', 'Feed-grade calcium source.', '50 kg bags', 135.00, 1, 0, array[]::text[], array['/images/products/bone/bone.png'], false),
  ('premix', 'Vitamin & mineral premix', 'Premixes & additives', 'Species and stage-specific premix.', '25 kg bags', 0.00, 0.025, 0, array[]::text[], array['/images/products/placeholder.png'], false)
on conflict (id) do nothing;
