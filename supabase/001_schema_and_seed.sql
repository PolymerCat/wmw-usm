-- WMW-USM Supabase setup (dashboard SQL)
-- Phase 1: Read-only app with public SELECT access.

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

-- Phase 2 placeholder for maintainer write access:
-- create policy "Maintainers write buildings"
-- on public.buildings
-- for all
-- to authenticated
-- using ((auth.jwt() ->> 'role') = 'maintainer')
-- with check ((auth.jwt() ->> 'role') = 'maintainer');
--
-- create policy "Maintainers write dispensers"
-- on public.dispensers
-- for all
-- to authenticated
-- using ((auth.jwt() ->> 'role') = 'maintainer')
-- with check ((auth.jwt() ->> 'role') = 'maintainer');

insert into public.buildings (id, name, latitude, longitude)
values
  ('bld-1', 'Desasiwa Restu M01', 5.356019667609643, 100.28920639408403),
  ('bld-2', 'School of Computer Sciences', 5.354544421429285, 100.30136801786983),
  ('bld-3', 'Cafeteria Bakti', 5.357748113174808, 100.30055098305601),
  ('bld-4', 'Bangunan KOMCA', 5.3596954466948725, 100.30214372647505),
  ('bld-5', 'School of Social Science', 5.358474709308763, 100.30460688274864)
on conflict (id) do update set
  name = excluded.name,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

insert into public.dispensers (
  building_id,
  dispenser_id,
  location_description,
  brand,
  cold_water_status,
  maintenance_status
)
values
  ('bld-1', 'dsp-1', '1st Floor, Pantry', 'Coway', 'Available', 'Operational'),
  ('bld-1', 'dsp-2', '3rd Floor, Pantry', 'Cuckoo', 'Unavailable', 'Under Maintenance'),
  ('bld-1', 'dsp-3', '5th Floor, Pantry', 'Cuckoo', 'Unavailable', 'Under Maintenance'),
  ('bld-1', 'dsp-4', '7th Floor, Pantry', 'Cuckoo', 'Unavailable', 'Under Maintenance'),
  ('bld-1', 'dsp-5', '9th Floor, Pantry', 'Cuckoo', 'Unavailable', 'Under Maintenance'),
  ('bld-2', 'dsp-3', 'Pantry CS', 'Cuckoo', 'Available', 'Operational'),
  ('bld-3', 'dsp-4', '2nd Floor Cafe, near Surau', 'Coway', 'Available', 'Operational'),
  ('bld-4', 'dsp-6', 'Level 2, In front of MPP Room', 'Cuckoo', 'Available', 'Operational'),
  ('bld-5', 'dsp-6', 'PPSK Student Lounge', 'Cuckoo', 'Available', 'Operational')
on conflict (building_id, dispenser_id) do update set
  location_description = excluded.location_description,
  brand = excluded.brand,
  cold_water_status = excluded.cold_water_status,
  maintenance_status = excluded.maintenance_status;

commit;
