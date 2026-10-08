-- Serialize default-list changes made concurrently from multiple browser tabs.
-- The original default-list migration is already present in production, so
-- this forward migration replaces only the function implementation.
create or replace function public.set_default_ingredient_list(p_list_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
begin
  if v_owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Different owners remain independent, while calls for the same owner wait
  -- for the current transaction to commit or roll back.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ingredient-list-default:' || v_owner_id::text, 0)
  );

  if not exists (select 1 from public.ingredient_lists where id = p_list_id and owner_id = v_owner_id) then
    raise exception 'Ingredient list not found' using errcode = 'P0002';
  end if;
  update public.ingredient_lists set is_default = false where owner_id = v_owner_id and is_default and id <> p_list_id;
  update public.ingredient_lists set is_default = true where id = p_list_id and owner_id = v_owner_id;
end;
$$;

revoke execute on function public.set_default_ingredient_list(uuid) from public;
grant execute on function public.set_default_ingredient_list(uuid) to authenticated;
