-- Ingredient lists: each user's named lists of catalogue ingredients ("My
-- ingredients" in the formulation studio), with the price they pay and the
-- setting they usually use. Ingredients are referenced by their id in the
-- checked-in ingredient library, so there is no foreign key for them here;
-- the app only offers ids from that library.

-- Lists ---------------------------------------------------------------------------
create table public.ingredient_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredient_lists_owner_id_idx on public.ingredient_lists (owner_id);

create trigger ingredient_lists_set_updated_at before update on public.ingredient_lists
  for each row execute function public.set_updated_at();

alter table public.ingredient_lists enable row level security;

create policy "Users can read their lists" on public.ingredient_lists
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Users can create their lists" on public.ingredient_lists
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Users can update their lists" on public.ingredient_lists
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Users can delete their lists" on public.ingredient_lists
  for delete to authenticated using (owner_id = (select auth.uid()));

-- List items ----------------------------------------------------------------------
-- role and the percentages mirror the formulator's ingredient settings:
-- available (0 up to max), required (at least min), fixed (exactly fixed_pct)
-- or excluded (kept in the list, never used). A null price means "use the
-- FeedSport planning price".
create table public.ingredient_list_items (
  list_id uuid not null references public.ingredient_lists (id) on delete cascade,
  ingredient_id text not null check (char_length(ingredient_id) between 1 and 120),
  role text not null default 'available' check (role in ('available', 'required', 'fixed', 'excluded')),
  price_usd_per_tonne numeric(12, 2) check (price_usd_per_tonne > 0),
  price_updated_at timestamptz,
  min_pct numeric(6, 3) check (min_pct >= 0 and min_pct <= 100),
  max_pct numeric(6, 3) check (max_pct > 0 and max_pct <= 100),
  fixed_pct numeric(6, 3) check (fixed_pct > 0 and fixed_pct <= 100),
  added_at timestamptz not null default now(),
  primary key (list_id, ingredient_id),
  check (role <> 'fixed' or fixed_pct is not null),
  check (min_pct is null or max_pct is null or min_pct <= max_pct)
);

-- Stamp the price date whenever the price itself changes, so "price over 30
-- days old" reflects the user's last edit rather than a client clock.
create or replace function public.ingredient_list_items_price_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price_usd_per_tonne is null then
    new.price_updated_at = null;
  elsif tg_op = 'INSERT' or new.price_usd_per_tonne is distinct from old.price_usd_per_tonne then
    new.price_updated_at = now();
  else
    new.price_updated_at = old.price_updated_at;
  end if;
  return new;
end;
$$;

create trigger ingredient_list_items_price_date before insert or update on public.ingredient_list_items
  for each row execute function public.ingredient_list_items_price_date();

alter table public.ingredient_list_items enable row level security;

-- Items belong to whoever owns their list.
create policy "Users can read items in their lists" on public.ingredient_list_items
  for select to authenticated using (
    exists (select 1 from public.ingredient_lists l where l.id = list_id and l.owner_id = (select auth.uid()))
  );
create policy "Users can add items to their lists" on public.ingredient_list_items
  for insert to authenticated with check (
    exists (select 1 from public.ingredient_lists l where l.id = list_id and l.owner_id = (select auth.uid()))
  );
create policy "Users can update items in their lists" on public.ingredient_list_items
  for update to authenticated using (
    exists (select 1 from public.ingredient_lists l where l.id = list_id and l.owner_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.ingredient_lists l where l.id = list_id and l.owner_id = (select auth.uid()))
  );
create policy "Users can remove items from their lists" on public.ingredient_list_items
  for delete to authenticated using (
    exists (select 1 from public.ingredient_lists l where l.id = list_id and l.owner_id = (select auth.uid()))
  );
