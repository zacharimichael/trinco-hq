-- Trin Co HQ: core schema. Every row belongs to a firm, and row-level security
-- keeps each firm's data private. Owners see their whole firm; agents see their own work.

create extension if not exists "pgcrypto";

create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_split int not null default 70 check (default_split between 0 and 100),
  stripe_customer_id text,
  subscription_status text not null default 'trialing',
  created_at timestamptz not null default now()
);

create type member_role as enum ('owner', 'agent');
create type member_stage as enum ('invited', 'signing_agreement', 'getting_licensed', 'active');

create table members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  role member_role not null default 'agent',
  stage member_stage not null default 'invited',
  name text not null,
  email text not null,
  phone text,
  address text,
  dob date,
  split int check (split between 0 and 100),
  created_at timestamptz not null default now(),
  unique (firm_id, email)
);

-- One row per completed step, e.g. ('FL', 'fl_app') or ('FL', 'fl_approved').
create table license_steps (
  member_id uuid not null references members(id) on delete cascade,
  state char(2) not null,
  step_id text not null,
  data jsonb not null default '{}',
  completed_at timestamptz not null default now(),
  primary key (member_id, step_id)
);

create table athletes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  agent_id uuid not null references members(id),
  name text not null,
  email text,
  school text not null,
  state char(2) not null,
  sport text,
  contract_signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table athlete_steps (
  athlete_id uuid not null references athletes(id) on delete cascade,
  step_id text not null,
  data jsonb not null default '{}',
  completed_at timestamptz not null default now(),
  primary key (athlete_id, step_id)
);

-- Every signed, paid or booked item. The PDF lives in storage; the signature evidence lives here.
create table documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  member_id uuid references members(id),
  athlete_id uuid references athletes(id),
  name text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create table signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  signer_name text not null,
  signer_email text not null,
  method text not null check (method in ('drawn', 'typed', 'docusign')),
  value text not null,
  consent boolean not null check (consent),
  ip inet,
  user_agent text,
  document_sha256 text not null,
  signed_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  athlete_id uuid not null references athletes(id),
  agent_id uuid not null references members(id),
  brand text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  fee_pct numeric(5,2) not null check (fee_pct between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Helpers for row-level security.
create function my_member() returns members language sql stable security definer set search_path = public as $$
  select * from members where user_id = auth.uid() limit 1
$$;
create function is_owner(f uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and firm_id = f and role = 'owner')
$$;

alter table firms enable row level security;
alter table members enable row level security;
alter table license_steps enable row level security;
alter table athletes enable row level security;
alter table athlete_steps enable row level security;
alter table documents enable row level security;
alter table signatures enable row level security;
alter table deals enable row level security;

create policy firm_read on firms for select using (id = (my_member()).firm_id);
create policy firm_owner_write on firms for update using (is_owner(id));

create policy members_read on members for select using (firm_id = (my_member()).firm_id);
create policy members_owner_write on members for all using (is_owner(firm_id)) with check (is_owner(firm_id));
create policy members_self_update on members for update using (user_id = auth.uid());

create policy license_own on license_steps for all
  using (member_id = (my_member()).id or is_owner((select firm_id from members m where m.id = member_id)))
  with check (member_id = (my_member()).id);

create policy athletes_access on athletes for all
  using (agent_id = (my_member()).id or is_owner(firm_id))
  with check (firm_id = (my_member()).firm_id);

create policy athlete_steps_access on athlete_steps for all
  using (exists (select 1 from athletes a where a.id = athlete_id and (a.agent_id = (my_member()).id or is_owner(a.firm_id))))
  with check (exists (select 1 from athletes a where a.id = athlete_id and a.agent_id = (my_member()).id));

create policy documents_access on documents for all
  using (member_id = (my_member()).id or is_owner(firm_id))
  with check (firm_id = (my_member()).firm_id);

-- Signatures are append-only: no update or delete policy.
create policy signatures_read on signatures for select
  using (exists (select 1 from documents d where d.id = document_id and (d.member_id = (my_member()).id or is_owner(d.firm_id))));
create policy signatures_insert on signatures for insert
  with check (exists (select 1 from documents d where d.id = document_id and d.member_id = (my_member()).id));

create policy deals_access on deals for select using (agent_id = (my_member()).id or is_owner(firm_id));
create policy deals_owner_write on deals for all using (is_owner(firm_id)) with check (is_owner(firm_id));
