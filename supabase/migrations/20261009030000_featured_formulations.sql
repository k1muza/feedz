-- Featured formulations on the studio's Home screen: starting points published
-- by FeedSport's nutritionists, authored through the advisor MCP endpoint
-- (save_featured_formulation). Anyone can read published ones; the server
-- writes with the secret key, and admins can manage them directly.
--
-- snapshot is a studio Snapshot: programmeId, phaseId, pool (ingredient id ->
-- role and limits), goal and batch. Prices are left out on purpose, so the
-- Studio formulates each one live at FeedSport planning prices; one that stops
-- meeting its stage drops off Home.

create table public.featured_formulations (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  name text not null check (char_length(name) between 1 and 120),
  description text not null check (char_length(description) between 1 and 500),
  author text not null default 'FeedSport Nutrition Team' check (char_length(author) between 1 and 120),
  author_role text not null default 'FeedSport nutritionist' check (char_length(author_role) between 1 and 120),
  place text not null default 'Harare' check (char_length(place) between 1 and 120),
  snapshot jsonb not null,
  published boolean not null default true,
  -- Lower first; Home shows the first three that formulate for the chosen species.
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index featured_formulations_order_idx on public.featured_formulations (sort_order, created_at);

create trigger featured_formulations_set_updated_at before update on public.featured_formulations
  for each row execute function public.set_updated_at();

alter table public.featured_formulations enable row level security;

create policy "Anyone can read published featured formulations" on public.featured_formulations
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "Admins can add featured formulations" on public.featured_formulations
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update featured formulations" on public.featured_formulations
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete featured formulations" on public.featured_formulations
  for delete to authenticated using ((select public.is_admin()));

-- The five starting points that used to be written into the studio's code.
insert into public.featured_formulations (id, name, description, snapshot, sort_order) values
  ('pig-grower-maize-soya-lysine', 'Pig grower on maize and soya, with lysine', 'A standard least-cost grower. Adding L-lysine lets it use less soybean meal than a plain maize–soya mix.', '{"programmeId":"grow-finish-pig","phaseId":"br2024-5-43-63-91d-26-47kg","goal":"least_cost","batch":100,"pool":{"corn-yellow-dent":{"role":"available"},"soybean-meal-solvent-extracted":{"role":"available"},"wheat-bran":{"role":"available","max":10},"soybean-degummed-oil":{"role":"available"},"l-lysine-hcl":{"role":"available"},"l-threonine":{"role":"available"},"dl-methionine":{"role":"available"},"l-tryptophan":{"role":"available"},"limestone-ground":{"role":"available"},"dicalcium-phosphate":{"role":"available"},"sodium-chloride":{"role":"available"}}}'::jsonb, 10),
  ('pig-finisher-sorghum', 'Sorghum finisher for maize-short seasons', 'Swaps maize for sorghum entirely. Built for when local maize is expensive or hard to find.', '{"programmeId":"grow-finish-pig","phaseId":"br2024-5-43-119-147d-74-103kg","goal":"least_cost","batch":1000,"pool":{"sorghum-grain":{"role":"available"},"soybean-meal-solvent-extracted":{"role":"available"},"wheat-bran":{"role":"available"},"soybean-degummed-oil":{"role":"available"},"l-lysine-hcl":{"role":"available"},"l-threonine":{"role":"available"},"dl-methionine":{"role":"available"},"limestone-ground":{"role":"available"},"dicalcium-phosphate":{"role":"available"},"sodium-chloride":{"role":"available"}}}'::jsonb, 20),
  ('broiler-starter-maize-soya', 'Broiler starter, maize–soya with synthetic amino acids', 'High-protein starter for days 8–17. Full-fat soya and soybean oil lift energy; synthetic amino acids keep soybean meal in check.', '{"programmeId":"broiler-standard","phaseId":"br2024-2-30-8-17d-0.24-0.68kg","goal":"least_cost","batch":1000,"pool":{"corn-yellow-dent":{"role":"available"},"soybean-meal-solvent-extracted":{"role":"available"},"soybean-full-fat-extruded":{"role":"available"},"soybean-degummed-oil":{"role":"available"},"dl-methionine":{"role":"available"},"l-lysine-hcl":{"role":"available","max":0.5},"l-threonine":{"role":"available","max":0.3},"l-valine":{"role":"available"},"l-isoleucine":{"role":"available"},"limestone-ground":{"role":"available"},"dicalcium-phosphate":{"role":"available"},"sodium-chloride":{"role":"available"}}}'::jsonb, 30),
  ('sow-lactation-full-fat-soya', 'Lactating sow, high energy with full-fat soya', 'For sows losing condition in lactation. Extruded full-fat soya brings energy and protein in one ingredient.', '{"programmeId":"lactating-gilt-sow","phaseId":"br2024-6-15-po3plus-2.82kg-lwg","goal":"least_cost","batch":1000,"pool":{"corn-yellow-dent":{"role":"available"},"soybean-meal-solvent-extracted":{"role":"available"},"soybean-full-fat-extruded":{"role":"available"},"soybean-degummed-oil":{"role":"available"},"l-lysine-hcl":{"role":"available"},"l-threonine":{"role":"available"},"dl-methionine":{"role":"available"},"l-tryptophan":{"role":"available"},"l-valine":{"role":"available"},"l-isoleucine":{"role":"available"},"limestone-ground":{"role":"available"},"dicalcium-phosphate":{"role":"available"},"sodium-chloride":{"role":"available"}}}'::jsonb, 40),
  ('sow-gestation-hand-mix', 'Simple gestation diet for hand mixing', 'Kept short on purpose: bran-heavy, few ingredients and easy to mix by hand on the farm.', '{"programmeId":"gestating-gilt-sow","phaseId":"br2024-6-08-po3plus-0-85d","goal":"simpler","batch":100,"pool":{"corn-yellow-dent":{"role":"available"},"soybean-meal-solvent-extracted":{"role":"available"},"wheat-bran":{"role":"available"},"soybean-degummed-oil":{"role":"available"},"limestone-ground":{"role":"available"},"dicalcium-phosphate":{"role":"available"},"sodium-chloride":{"role":"available"}}}'::jsonb, 50);
