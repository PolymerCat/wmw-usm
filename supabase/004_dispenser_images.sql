-- Add dispenser image support using Supabase Storage.

begin;

alter table public.dispensers
add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('dispenser-images', 'dispenser-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public read dispenser images" on storage.objects;
create policy "Public read dispenser images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'dispenser-images');

drop policy if exists "Admin insert dispenser images" on storage.objects;
create policy "Admin insert dispenser images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dispenser-images'
  and exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admin update dispenser images" on storage.objects;
create policy "Admin update dispenser images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dispenser-images'
  and exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  bucket_id = 'dispenser-images'
  and exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admin delete dispenser images" on storage.objects;
create policy "Admin delete dispenser images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dispenser-images'
  and exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

commit;
