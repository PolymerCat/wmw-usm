-- WMW-USM Supabase setup (schema only)
-- Use this file for production/new-environment bootstrap.
-- Legacy note: 001_schema_and_seed.sql remains historical and may already be applied.

begin;

create table if not exists public.buildings (
  id text primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dispensers (
  building_id text not null references public.buildings(id) on delete cascade,
  dispenser_id text not null,
  location_description text not null,
  brand text not null,
  cold_water_status text not null,
  maintenance_status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (building_id, dispenser_id),
  constraint dispensers_cold_water_status_check
    check (cold_water_status in ('Available', 'Unavailable', 'Unknown')),
  constraint dispensers_maintenance_status_check
    check (maintenance_status in ('Operational', 'Under Maintenance', 'Broken'))
);

create index if not exists dispensers_building_id_idx
  on public.dispensers (building_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_updated_at_buildings on public.buildings;
create trigger set_updated_at_buildings
before update on public.buildings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_dispensers on public.dispensers;
create trigger set_updated_at_dispensers
before update on public.dispensers
for each row execute function public.set_updated_at();

alter table public.buildings enable row level security;
alter table public.dispensers enable row level security;

drop policy if exists "Public read buildings" on public.buildings;
create policy "Public read buildings"
on public.buildings
for select
to anon, authenticated
using (true);

drop policy if exists "Public read dispensers" on public.dispensers;
create policy "Public read dispensers"
on public.dispensers
for select
to anon, authenticated
using (true);

commit;
