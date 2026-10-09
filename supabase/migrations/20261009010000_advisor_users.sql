-- Advisors: FeedSport nutritionists who may read every user's saved
-- formulations through the MCP server (/api/mcp/advisor) after signing in with
-- OAuth. Admins are advisors too. Add one after they have a FeedSport account:
--   insert into public.advisor_users (user_id, email)
--   select id, email from auth.users where email = 'nutritionist@example.com';
create table public.advisor_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.advisor_users enable row level security;

create or replace function public.is_advisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.advisor_users where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_advisor() from public;
grant execute on function public.is_advisor() to authenticated;

create policy "Admins can read advisor list" on public.advisor_users
  for select to authenticated using ((select public.is_admin()));
create policy "Admins can add advisors" on public.advisor_users
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can remove advisors" on public.advisor_users
  for delete to authenticated using ((select public.is_admin()));
