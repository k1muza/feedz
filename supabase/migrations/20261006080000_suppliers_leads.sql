-- Supply contacts and sales leads: admin-only CRM records.

-- Suppliers -----------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(company) between 1 and 160),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  phone text not null default '' check (char_length(phone) <= 60),
  email text not null default '' check (char_length(email) <= 254),
  location text not null default '' check (char_length(location) <= 160),
  supplies text[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 5000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create policy "Admins can read suppliers" on public.suppliers
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can insert suppliers" on public.suppliers
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update suppliers" on public.suppliers
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete suppliers" on public.suppliers
  for delete to authenticated using ((select public.is_admin()));

-- Leads ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  company text not null default '' check (char_length(company) <= 160),
  phone text not null default '' check (char_length(phone) <= 60),
  email text not null default '' check (char_length(email) <= 254),
  location text not null default '' check (char_length(location) <= 160),
  interest text not null default '' check (char_length(interest) <= 500),
  source text not null default '' check (char_length(source) <= 60),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  follow_up_on date,
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);

create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

create policy "Admins can read leads" on public.leads
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can insert leads" on public.leads
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update leads" on public.leads
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete leads" on public.leads
  for delete to authenticated using ((select public.is_admin()));
