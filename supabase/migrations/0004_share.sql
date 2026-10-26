-- Shared access. Paste into Supabase → SQL Editor → Run.
--
-- The owner can share the agency with someone from HQ → Shared access. That
-- person signs in with the email the owner added and can see everything the
-- owner sees (map, to-do list, players, depth charts, HQ) and add film to
-- players. They can't change or delete anything. Only the owner can add or
-- remove them. The site stays private: nobody else can sign up (0003_private.sql).

alter table members drop constraint if exists members_role_check;
alter table members add constraint members_role_check check (role in ('owner', 'agent', 'viewer'));

-- The owner, or someone the owner shared the agency with.
create or replace function sees_firm(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and firm_id = f and role in ('owner', 'viewer'))
$$;

drop policy if exists members_owner_insert on members;
create policy members_owner_insert on members for insert with check (am_owner(firm_id) and role in ('agent', 'viewer'));
drop policy if exists members_owner_delete on members;
create policy members_owner_delete on members for delete using (am_owner(firm_id) and role <> 'owner');

drop policy if exists state_read on member_state;
create policy state_read on member_state for select
  using (member_id = my_member_id() or sees_firm((select firm_id from members where id = member_id)));

drop policy if exists sig_read on signatures;
create policy sig_read on signatures for select
  using (member_id = my_member_id() or sees_firm((select firm_id from members where id = member_id)));

-- Film someone you shared with added. Kept apart from firms.data so their
-- additions and your own edits never overwrite each other.
create table if not exists shared_film (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  player_id text not null,
  film jsonb not null,
  added_by text not null default coalesce(auth.jwt() ->> 'email', ''),
  created_at timestamptz not null default now()
);
alter table shared_film enable row level security;

drop policy if exists shared_film_read on shared_film;
create policy shared_film_read on shared_film for select using (firm_id = my_firm_id());
drop policy if exists shared_film_insert on shared_film;
create policy shared_film_insert on shared_film for insert with check (firm_id = my_firm_id() and sees_firm(firm_id));
drop policy if exists shared_film_delete on shared_film;
create policy shared_film_delete on shared_film for delete using (am_owner(firm_id));

-- They can upload videos too (removing stays owner-only, see 0002_film.sql).
drop policy if exists film_insert on storage.objects;
create policy film_insert on storage.objects for insert
  with check (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text and sees_firm(my_firm_id()));
