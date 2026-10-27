-- Gives one person full access with a password, without needing the sign-in email.
-- Paste into Supabase → SQL Editor, fill in the two lines marked ← , then Run.
-- Needs 0004_share.sql and 0005_editor.sql (run those first, or paste all three together).
--
-- It creates their sign-in account (or resets its password if they already have
-- one), confirms it, and adds them to your agency with full access. They sign in
-- on the site with "Use a password instead". Safe to run again.

do $$
declare
  v_email text := lower(trim('THEIR-EMAIL@example.com'));   -- ← their email
  v_password text := 'CHOOSE-A-PASSWORD';                     -- ← a password for them, 8+ characters
  f uuid; uid uuid; m uuid;
begin
  if v_email like '%example.com' then raise exception 'Put their email on the v_email line first.'; end if;
  if v_password = 'CHOOSE-A-PASSWORD' or length(v_password) < 8 then raise exception 'Put a password of 8 or more characters on the v_password line first.'; end if;
  select firm_id into f from members where role = 'owner' order by created_at limit 1;
  if f is null then raise exception 'No agency yet. Sign in to the site yourself once first.'; end if;

  -- Their sign-in account, confirmed, with this password.
  select id into uid from auth.users where lower(email) = v_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());
  else
    update auth.users set encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = uid;
  end if;

  -- Full access in your agency.
  if exists (select 1 from members where user_id = uid and (firm_id <> f or lower(email) <> v_email)) then
    raise exception 'That account is already linked to another member. Remove it under HQ → Shared access first.';
  end if;
  insert into members (firm_id, user_id, email, name, role, stage) values (f, uid, v_email, v_email, 'editor', 3)
    on conflict (firm_id, email) do update set role = 'editor', user_id = excluded.user_id, stage = 3
    returning id into m;
  insert into member_state (member_id) values (m) on conflict do nothing;
  raise notice 'Done. % has full access.', v_email;
end $$;
