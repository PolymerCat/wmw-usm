-- Admin auth + RLS write policies for dispenser management.

begin;

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_users_lowercase_email_check check (email = lower(email))
);

alter table public.admin_users enable row level security;

drop policy if exists "Admin users can read own row" on public.admin_users;
create policy "Admin users can read own row"
on public.admin_users
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Admin insert dispensers" on public.dispensers;
create policy "Admin insert dispensers"
on public.dispensers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admin update dispensers" on public.dispensers;
create policy "Admin update dispensers"
on public.dispensers
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admin delete dispensers" on public.dispensers;
create policy "Admin delete dispensers"
on public.dispensers
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "Admin update buildings" on public.buildings;
create policy "Admin update buildings"
on public.buildings
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
)
with check (
  exists (
    select 1
    from public.admin_users admin
    where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

commit;
