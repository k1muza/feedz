-- Advice a nutritionist leaves on a user's saved formulation through the
-- FeedSport MCP server. The server writes with the secret key, so there is no
-- insert policy: users can only read advice on their own formulations. A note
-- may carry a suggested revision, a complete studio snapshot the user can open
-- and save as a new version.

create table public.formulation_advice (
  id uuid primary key default gen_random_uuid(),
  formulation_id uuid not null references public.formulations (id) on delete cascade,
  -- The version the advice was written against; null means the formulation as a whole.
  version integer check (version > 0),
  author text not null check (char_length(author) between 1 and 120),
  body text not null check (char_length(body) between 1 and 10000),
  suggested_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index formulation_advice_formulation_id_idx on public.formulation_advice (formulation_id, created_at desc);

alter table public.formulation_advice enable row level security;

create policy "Users can read advice on their formulations" on public.formulation_advice
  for select to authenticated using (
    exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid()))
  );
