-- Trin Co HQ database. Paste this whole file into Supabase → SQL Editor → Run.
--
-- Each firm has members (one owner, many agents). Each member's licensing
-- progress, athletes and documents live in member_state.data, the same shape
-- the app uses (see src/lib/model.ts). Row-level security keeps every firm
-- private: agents see their own work, owners see their whole firm.

create table if not exists firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_split int not null default 70 check (default_split between 0 and 100),
  -- Firm-wide data the owner manages, such as deals.
  data jsonb not null default '{}',
  subscription_status text not null default 'trialing',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  role text not null default 'agent' check (role in ('owner', 'agent')),
  -- 0 invited, 1 signing agency agreement, 2 getting licensed, 3 active
  stage int not null default 0 check (stage between 0 and 3),
  split int check (split between 0 and 100),
  created_at timestamptz not null default now(),
  unique (firm_id, email)
);

create table if not exists member_state (
  member_id uuid primary key references members(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Signature evidence. Append-only: there are no update or delete policies.
create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  document text not null,
  document_sha256 text not null,
  method text not null check (method in ('drawn', 'typed')),
  value text not null,
  consent boolean not null check (consent),
  user_agent text,
  signed_at timestamptz not null default now()
);

-- Helpers (security definer so policies don't recurse into members).
create or replace function my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid() limit 1
$$;

create or replace function my_firm_id() returns uuid
language sql stable security definer set search_path = public as $$
  select firm_id from members where user_id = auth.uid() limit 1
$$;

create or replace function am_owner(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and firm_id = f and role = 'owner')
$$;

-- Called once by a new owner: creates the firm and makes them its owner.
create or replace function create_firm(p_firm_name text, p_owner_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid; m uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'already in a firm'; end if;
  insert into firms (name) values (p_firm_name) returning id into f;
  insert into members (firm_id, user_id, email, name, role, stage)
    values (f, auth.uid(), coalesce(auth.jwt() ->> 'email', ''), p_owner_name, 'owner', 3) returning id into m;
  insert into member_state (member_id) values (m);
  return f;
end $$;

-- Called on every sign-in: links an invited agent's account to their invite by email.
create or replace function claim_invite() returns uuid
language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into m from members where user_id = auth.uid();
  if m is not null then return m; end if;
  update members set user_id = auth.uid(), stage = greatest(stage, 1)
    where user_id is null and lower(email) = lower(auth.jwt() ->> 'email')
    returning id into m;
  if m is not null then
    insert into member_state (member_id) values (m) on conflict do nothing;
  end if;
  return m;
end $$;

-- Called when an agent signs the agency agreement: moves them on to getting licensed.
create or replace function sign_agency_agreement() returns void
language sql security definer set search_path = public as $$
  update members set stage = 2 where user_id = auth.uid() and stage < 2
$$;

alter table firms enable row level security;
alter table members enable row level security;
alter table member_state enable row level security;
alter table signatures enable row level security;

drop policy if exists firms_read on firms;
create policy firms_read on firms for select using (id = my_firm_id());
drop policy if exists firms_owner_update on firms;
create policy firms_owner_update on firms for update using (am_owner(id)) with check (am_owner(id));

drop policy if exists members_read on members;
create policy members_read on members for select using (firm_id = my_firm_id());
drop policy if exists members_owner_insert on members;
create policy members_owner_insert on members for insert with check (am_owner(firm_id) and role = 'agent');
drop policy if exists members_owner_update on members;
create policy members_owner_update on members for update using (am_owner(firm_id)) with check (am_owner(firm_id));
drop policy if exists members_owner_delete on members;
create policy members_owner_delete on members for delete using (am_owner(firm_id) and role = 'agent');

drop policy if exists state_read on member_state;
create policy state_read on member_state for select
  using (member_id = my_member_id() or am_owner((select firm_id from members where id = member_id)));
drop policy if exists state_write on member_state;
create policy state_write on member_state for insert with check (member_id = my_member_id());
drop policy if exists state_update on member_state;
create policy state_update on member_state for update using (member_id = my_member_id()) with check (member_id = my_member_id());

drop policy if exists sig_insert on signatures;
create policy sig_insert on signatures for insert with check (member_id = my_member_id());
drop policy if exists sig_read on signatures;
create policy sig_read on signatures for select
  using (member_id = my_member_id() or am_owner((select firm_id from members where id = member_id)));

grant execute on function create_firm(text, text), claim_invite(), sign_agency_agreement() to authenticated;
