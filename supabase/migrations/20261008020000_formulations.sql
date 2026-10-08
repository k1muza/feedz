-- Saved formulations from the formulation studio. A formulation is a named
-- document; each save adds an immutable version holding everything needed to
-- reproduce the result (programme, phase, ingredients with prices and limits,
-- goal, batch) plus a summary of the result for lists and comparisons.

-- Formulations --------------------------------------------------------------------
create table public.formulations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index formulations_owner_id_idx on public.formulations (owner_id, updated_at desc);

create trigger formulations_set_updated_at before update on public.formulations
  for each row execute function public.set_updated_at();

alter table public.formulations enable row level security;

create policy "Users can read their formulations" on public.formulations
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Users can create their formulations" on public.formulations
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Users can update their formulations" on public.formulations
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Users can delete their formulations" on public.formulations
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Versions ------------------------------------------------------------------------
-- Versions are never edited: saving again adds the next version number.
create table public.formulation_versions (
  formulation_id uuid not null references public.formulations (id) on delete cascade,
  version integer not null check (version > 0),
  created_at timestamptz not null default now(),
  snapshot jsonb not null,
  summary jsonb not null,
  primary key (formulation_id, version)
);

alter table public.formulation_versions enable row level security;

create policy "Users can read versions of their formulations" on public.formulation_versions
  for select to authenticated using (
    exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid()))
  );
create policy "Users can add versions to their formulations" on public.formulation_versions
  for insert to authenticated with check (
    exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid()))
  );
create policy "Users can delete versions of their formulations" on public.formulation_versions
  for delete to authenticated using (
    exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid()))
  );

-- Saves a new version, creating the formulation when p_formulation_id is null
-- and renaming it otherwise. Numbering happens under a row lock so two tabs
-- saving at once get consecutive versions. Runs as the caller, so row-level
-- security limits it to their own formulations.
create or replace function public.save_formulation_version(
  p_formulation_id uuid,
  p_name text,
  p_snapshot jsonb,
  p_summary jsonb
)
returns table (formulation_id uuid, version integer, created_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_formulation_id;
  v_version integer;
begin
  if v_id is null then
    insert into public.formulations (name) values (p_name) returning id into v_id;
  else
    update public.formulations f set name = p_name where f.id = v_id;
    perform 1 from public.formulations f where f.id = v_id for update;
    if not found then
      raise exception 'Formulation not found' using errcode = 'P0002';
    end if;
  end if;
  select coalesce(max(v.version), 0) + 1 into v_version from public.formulation_versions v where v.formulation_id = v_id;
  return query
    insert into public.formulation_versions as v (formulation_id, version, snapshot, summary)
    values (v_id, v_version, p_snapshot, p_summary)
    returning v.formulation_id, v.version, v.created_at;
end;
$$;

revoke execute on function public.save_formulation_version(uuid, text, jsonb, jsonb) from public;
grant execute on function public.save_formulation_version(uuid, text, jsonb, jsonb) to authenticated;
