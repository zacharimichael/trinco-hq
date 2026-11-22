-- Lets the owner turn on "All tabs" for someone they shared with (Agents → Shared access),
-- so that person also sees Home, Licensing, Pod leaders and Calendar. Safe to run again.
-- The owner can already update members rows (members_owner_update), so no new policy is needed.
alter table members add column if not exists all_tabs boolean not null default false;
