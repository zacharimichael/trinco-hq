-- Makes the site private. Paste into Supabase → SQL Editor, put your email on the
-- last line, then Run.
--
-- Only emails on this list can create an agency. Everyone else who signs in gets
-- "This site is private" and can't see or save anything: every table already
-- only shows a firm's data to that firm's own members (0001_init.sql).
-- Agents you invite from HQ can still join your agency.

create table if not exists allowed_owners (email text primary key);
-- No policies: the app can't read or change this list, only the SQL Editor can.
alter table allowed_owners enable row level security;

create or replace function create_firm(p_firm_name text, p_owner_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid; m uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from allowed_owners where lower(email) = lower(auth.jwt() ->> 'email')) then
    raise exception 'This site is private';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'already in a firm'; end if;
  insert into firms (name) values (p_firm_name) returning id into f;
  insert into members (firm_id, user_id, email, name, role, stage)
    values (f, auth.uid(), coalesce(auth.jwt() ->> 'email', ''), p_owner_name, 'owner', 3) returning id into m;
  insert into member_state (member_id) values (m);
  return f;
end $$;

-- Your email goes here:
insert into allowed_owners (email) values ('YOUR-EMAIL@example.com') on conflict do nothing;
