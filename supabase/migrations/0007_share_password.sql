-- Lets you give someone access with a password right from the site (HQ → Shared access),
-- so nobody has to open Supabase again. Run this once in Supabase → SQL Editor. Safe to run again.
-- Needs 0004_share.sql and 0005_editor.sql (already run if Kyle has access).

create or replace function share_with_password(p_email text, p_password text, p_view_only boolean) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(p_email));
  v_role text := case when p_view_only then 'viewer' else 'editor' end;
  f uuid := my_firm_id(); uid uuid; m uuid;
begin
  if f is null or not am_owner(f) then raise exception 'Only the owner can share.'; end if;
  if v_email !~ '^\S+@\S+\.\S+$' then raise exception 'Type their full email.'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Use a password of 8 or more characters.'; end if;

  select id into uid from auth.users where lower(email) = v_email;
  if uid is not null and exists (select 1 from members where user_id = uid and (firm_id <> f or role not in ('viewer', 'editor'))) then
    raise exception 'That email already has its own account here. It can''t be shared this way.';
  end if;

  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = uid;
  end if;

  insert into members (firm_id, user_id, email, name, role, stage) values (f, uid, v_email, v_email, v_role, 3)
    on conflict (firm_id, email) do update set role = v_role, user_id = excluded.user_id, stage = 3
    returning id into m;
  insert into member_state (member_id) values (m) on conflict do nothing;
  return m::text;
end $$;

revoke execute on function share_with_password(text, text, boolean) from public, anon;
grant execute on function share_with_password(text, text, boolean) to authenticated;
