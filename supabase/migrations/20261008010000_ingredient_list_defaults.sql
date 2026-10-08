-- Default ingredient lists and the starter list for new users.
--
-- Each user may mark one list as their default: it is shown first and is the
-- list formulations start from. New users get a starter list once, filled with
-- common ingredients chosen by the app; deleting it never brings it back.

-- Default flag ----------------------------------------------------------------------
alter table public.ingredient_lists add column is_default boolean not null default false;

create unique index ingredient_lists_one_default_per_owner on public.ingredient_lists (owner_id) where is_default;

-- Makes one of the caller's lists the default. Clears the old default first so
-- the one-default index never sees two at once. Runs as the caller, so row-level
-- security limits it to their own lists.
create or replace function public.set_default_ingredient_list(p_list_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.ingredient_lists where id = p_list_id and owner_id = (select auth.uid())) then
    raise exception 'Ingredient list not found' using errcode = 'P0002';
  end if;
  update public.ingredient_lists set is_default = false where owner_id = (select auth.uid()) and is_default and id <> p_list_id;
  update public.ingredient_lists set is_default = true where id = p_list_id;
end;
$$;

revoke execute on function public.set_default_ingredient_list(uuid) from public;
grant execute on function public.set_default_ingredient_list(uuid) to authenticated;

-- Starter list ----------------------------------------------------------------------
-- One row per user who has been given (or was too established for) a starter
-- list, so it is offered once even with several tabs open at the same moment.
create table public.ingredient_list_starters (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ingredient_list_starters enable row level security;

create policy "Users can read their starter record" on public.ingredient_list_starters
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Users can record their starter" on public.ingredient_list_starters
  for insert to authenticated with check (owner_id = (select auth.uid()));

-- Creates the caller's starter list (as their default) and returns its id, or
-- returns null when they were already given one or already have lists. The
-- ingredient ids come from the app's catalogue.
create or replace function public.create_starter_ingredient_list(p_label text, p_ingredient_ids text[])
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_list_id uuid;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  insert into public.ingredient_list_starters (owner_id) values ((select auth.uid())) on conflict do nothing;
  if not found then
    return null;
  end if;
  if exists (select 1 from public.ingredient_lists where owner_id = (select auth.uid())) then
    return null;
  end if;
  insert into public.ingredient_lists (label, is_default) values (p_label, true) returning id into v_list_id;
  insert into public.ingredient_list_items (list_id, ingredient_id)
    select v_list_id, t.ingredient_id from unnest(p_ingredient_ids) as t (ingredient_id)
    on conflict do nothing;
  return v_list_id;
end;
$$;

revoke execute on function public.create_starter_ingredient_list(text, text[]) from public;
grant execute on function public.create_starter_ingredient_list(text, text[]) to authenticated;
