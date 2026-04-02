-- Allow admin users to insert new buildings from the admin dashboard.

begin;

drop policy if exists "Admin insert buildings" on public.buildings;
create policy "Admin insert buildings"
on public.buildings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

commit;
