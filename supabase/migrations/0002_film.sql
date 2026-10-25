-- Film clips uploaded to player profiles (iPhone videos). Paste into Supabase → SQL Editor → Run.
-- Private bucket; files live under <firm id>/<player id>/ and only that firm's members can read them.
-- The owner manages scouting, so only the owner can add or remove clips.

insert into storage.buckets (id, name, public, file_size_limit)
values ('film', 'film', false, 524288000)
on conflict (id) do nothing;

drop policy if exists film_read on storage.objects;
create policy film_read on storage.objects for select
  using (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text);

drop policy if exists film_insert on storage.objects;
create policy film_insert on storage.objects for insert
  with check (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text and am_owner(my_firm_id()));

drop policy if exists film_delete on storage.objects;
create policy film_delete on storage.objects for delete
  using (bucket_id = 'film' and (storage.foldername(name))[1] = my_firm_id()::text and am_owner(my_firm_id()));
