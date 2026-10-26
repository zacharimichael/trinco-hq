-- Full access for the people you share with. Paste into Supabase → SQL Editor → Run.
--
-- Someone you share the agency with (HQ → Shared access) can now do everything
-- you can: your map and licensing, the to-do list, players, call logs, film,
-- depth charts, deals and onboarding agents. Only you can add or remove the
-- people you share with. Anyone already shared as view-only gets full access.
--
-- Saves now merge instead of overwriting, so two people working at the same
-- time don't erase each other's changes.

alter table members drop constraint if exists members_role_check;
alter table members add constraint members_role_check check (role in ('owner', 'agent', 'viewer', 'editor'));
update members set role = 'editor' where role = 'viewer';

create or replace function sees_firm(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and firm_id = f and role in ('owner', 'viewer', 'editor'))
$$;

-- The owner, or someone the owner shared full access with.
create or replace function edits_firm(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and firm_id = f and role in ('owner', 'editor'))
$$;

drop policy if exists firms_owner_update on firms;
create policy firms_owner_update on firms for update using (edits_firm(id)) with check (edits_firm(id));

drop policy if exists members_owner_insert on members;
create policy members_owner_insert on members for insert
  with check ((am_owner(firm_id) and role in ('agent', 'viewer', 'editor')) or (edits_firm(firm_id) and role = 'agent'));
drop policy if exists members_owner_update on members;
create policy members_owner_update on members for update
  using (am_owner(firm_id) or (edits_firm(firm_id) and role = 'agent'))
  with check (am_owner(firm_id) or (edits_firm(firm_id) and role = 'agent'));

drop policy if exists shared_film_delete on shared_film;
create policy shared_film_delete on shared_film for delete using (edits_firm(firm_id));

-- Film uploads (needs 0002_film.sql; run it first if uploads say "Bucket not found").
do $$ begin
  drop policy if exists film_insert on storage.objects;
  create policy film_insert on storage.objects for insert
    with check (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text and sees_firm(my_firm_id()));
  drop policy if exists film_delete on storage.objects;
  create policy film_delete on storage.objects for delete
    using (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text and edits_firm(my_firm_id()));
exception when others then raise notice 'Film uploads not updated: %', sqlerrm;
end $$;

-- Saves map and licensing changes. Someone with full access works on the owner's map.
-- p_patch replaces whole keys; p_merge merges into object keys (a null value removes that entry).
create or replace function save_my_state(p_patch jsonb, p_merge jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me members; target uuid; d jsonb; k text; v jsonb;
begin
  select * into me from members where user_id = auth.uid();
  if me.id is null then raise exception 'not signed in'; end if;
  if me.role = 'viewer' then raise exception 'View only'; end if;
  target := me.id;
  if me.role = 'editor' then
    select id into target from members where firm_id = me.firm_id and role = 'owner' limit 1;
  end if;
  insert into member_state (member_id) values (target) on conflict do nothing;
  select data into d from member_state where member_id = target for update;
  d := coalesce(d, '{}') || coalesce(p_patch, '{}');
  for k, v in select * from jsonb_each(coalesce(p_merge, '{}')) loop
    d := jsonb_set(d, array[k], jsonb_strip_nulls(coalesce(case when jsonb_typeof(d -> k) = 'object' then d -> k end, '{}') || v));
  end loop;
  update member_state set data = d, updated_at = now() where member_id = target;
end $$;

-- Saves player, school and deal changes one item at a time.
create or replace function save_firm_changes(p_players jsonb, p_removed text[], p_staff jsonb, p_schools jsonb, p_deals jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := my_firm_id(); d jsonb; sc jsonb; pl jsonb; p jsonb; i int; hit boolean;
begin
  if f is null or not edits_firm(f) then raise exception 'Not allowed'; end if;
  select data into d from firms where id = f for update;
  d := coalesce(d, '{}');
  sc := coalesce(d -> 'scouting', '{}');
  select coalesce(jsonb_agg(x order by o), '[]') into pl
    from jsonb_array_elements(coalesce(sc -> 'players', '[]')) with ordinality t(x, o)
    where not (x ->> 'id' = any (coalesce(p_removed, '{}')));
  for p in select * from jsonb_array_elements(coalesce(p_players, '[]')) loop
    hit := false;
    for i in 0 .. jsonb_array_length(pl) - 1 loop
      if pl -> i ->> 'id' = p ->> 'id' then pl := jsonb_set(pl, array[i::text], p); hit := true; exit; end if;
    end loop;
    if not hit then pl := pl || jsonb_build_array(p); end if;
  end loop;
  sc := jsonb_set(sc, '{players}', pl);
  sc := jsonb_set(sc, '{staff}', coalesce(sc -> 'staff', '{}') || coalesce(p_staff, '{}'));
  sc := jsonb_set(sc, '{extraSchools}', coalesce(sc -> 'extraSchools', '[]'));
  for p in select * from jsonb_array_elements(coalesce(p_schools, '[]')) loop
    if not exists (select 1 from jsonb_array_elements(sc -> 'extraSchools') s where s ->> 'id' = p ->> 'id') then
      sc := jsonb_set(sc, '{extraSchools}', (sc -> 'extraSchools') || jsonb_build_array(p));
    end if;
  end loop;
  d := jsonb_set(d, '{scouting}', sc);
  if p_deals is not null then d := jsonb_set(d, '{deals}', p_deals); end if;
  update firms set data = d where id = f;
end $$;

grant execute on function save_my_state(jsonb, jsonb), save_firm_changes(jsonb, text[], jsonb, jsonb, jsonb) to authenticated;
