-- FeedSport core schema: admin access, knowledge articles, team, policies,
-- contact inquiries and newsletter subscriptions.

-- Admins ---------------------------------------------------------------------
-- A signed-in user is an admin only if their auth user id is listed here.
-- Add one after creating the user in Authentication > Users:
--   insert into public.admin_users (user_id, email)
--   select id, email from auth.users where email = 'you@feedsport.co.zw';
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "Admins can read admin list" on public.admin_users
  for select to authenticated using ((select public.is_admin()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Knowledge articles -----------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  seo_title text check (seo_title is null or char_length(seo_title) <= 200),
  description text not null check (char_length(description) between 1 and 400),
  topic text not null,
  image_url text not null,
  image_alt text not null default '',
  image_credit text not null default '',
  ingredients text[] not null default '{}',
  keywords text[] not null default '{}',
  key_points text[] not null default '{}',
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_published_at_idx on public.articles (status, published_at desc);

create trigger articles_set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

create policy "Anyone can read published articles" on public.articles
  for select to anon, authenticated using (status = 'published');
create policy "Admins can read all articles" on public.articles
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can insert articles" on public.articles
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update articles" on public.articles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete articles" on public.articles
  for delete to authenticated using ((select public.is_admin()));

-- Team members -----------------------------------------------------------------
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  role text not null check (char_length(role) between 1 and 120),
  bio text not null default '',
  image text not null default '',
  linkedin text not null default '',
  email text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger team_members_set_updated_at before update on public.team_members
  for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;

create policy "Anyone can read team members" on public.team_members
  for select to anon, authenticated using (true);
create policy "Admins can insert team members" on public.team_members
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update team members" on public.team_members
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete team members" on public.team_members
  for delete to authenticated using ((select public.is_admin()));

-- Policies ---------------------------------------------------------------------
create table public.policies (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 200),
  content text not null,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger policies_set_updated_at before update on public.policies
  for each row execute function public.set_updated_at();

alter table public.policies enable row level security;

create policy "Anyone can read policies" on public.policies
  for select to anon, authenticated using (true);
create policy "Admins can insert policies" on public.policies
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update policies" on public.policies
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete policies" on public.policies
  for delete to authenticated using ((select public.is_admin()));

-- Contact inquiries --------------------------------------------------------------
-- Visitors can submit but never read; only admins read.
create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 1 and 5000),
  read boolean not null default false,
  submitted_at timestamptz not null default now()
);

create index contact_inquiries_submitted_at_idx on public.contact_inquiries (submitted_at desc);

alter table public.contact_inquiries enable row level security;

create policy "Anyone can submit an inquiry" on public.contact_inquiries
  for insert to anon, authenticated with check (read = false);
create policy "Admins can read inquiries" on public.contact_inquiries
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can update inquiries" on public.contact_inquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete inquiries" on public.contact_inquiries
  for delete to authenticated using ((select public.is_admin()));

-- Newsletter subscriptions -------------------------------------------------------
create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  subscribed_at timestamptz not null default now()
);

create unique index newsletter_subscriptions_email_key on public.newsletter_subscriptions (lower(email));

alter table public.newsletter_subscriptions enable row level security;

create policy "Anyone can subscribe" on public.newsletter_subscriptions
  for insert to anon, authenticated with check (true);
create policy "Admins can read subscribers" on public.newsletter_subscriptions
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can delete subscribers" on public.newsletter_subscriptions
  for delete to authenticated using ((select public.is_admin()));
