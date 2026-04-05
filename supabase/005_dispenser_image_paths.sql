-- Support multiple dispenser images per dispenser row.

begin;

alter table public.dispensers
add column if not exists image_paths text[] not null default '{}';

update public.dispensers
set image_paths = array[image_path]
where image_path is not null
  and cardinality(image_paths) = 0;

commit;
