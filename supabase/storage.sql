-- Baiolo storage buckets + policies
-- Run in Supabase → SQL Editor (or create buckets in Storage UI).

insert into storage.buckets (id, name, public)
values
  ('project-private', 'project-private', false),
  ('project-public', 'project-public', true)
on conflict (id) do update
set public = excluded.public;

-- Service role uploads bypass RLS; these policies help anon/authenticated reads
-- of published packages and allow authenticated owners to manage private files
-- when not using the service role key.

drop policy if exists "baiolo_public_read" on storage.objects;
create policy "baiolo_public_read"
  on storage.objects for select
  using (bucket_id = 'project-public');

drop policy if exists "baiolo_private_select" on storage.objects;
create policy "baiolo_private_select"
  on storage.objects for select
  using (bucket_id = 'project-private');

drop policy if exists "baiolo_private_insert" on storage.objects;
create policy "baiolo_private_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-private');

drop policy if exists "baiolo_private_update" on storage.objects;
create policy "baiolo_private_update"
  on storage.objects for update
  using (bucket_id = 'project-private');

drop policy if exists "baiolo_public_insert" on storage.objects;
create policy "baiolo_public_insert"
  on storage.objects for insert
  with check (bucket_id = 'project-public');

drop policy if exists "baiolo_public_update" on storage.objects;
create policy "baiolo_public_update"
  on storage.objects for update
  using (bucket_id = 'project-public');
