-- When the user first saw each advice note, for the unread count on the
-- studio's notification bell. Users may set read_at on advice on their own
-- formulations and change nothing else.

alter table public.formulation_advice add column read_at timestamptz;

revoke update on public.formulation_advice from anon, authenticated;
grant update (read_at) on public.formulation_advice to authenticated;

create policy "Users can mark advice on their formulations read" on public.formulation_advice
  for update to authenticated
  using (exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.formulations f where f.id = formulation_id and f.owner_id = (select auth.uid())));
