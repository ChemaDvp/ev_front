alter table public.catalog_items
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-item-images',
  'catalog-item-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read catalog item images" on storage.objects;
create policy "Admins can read catalog item images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'catalog-item-images'
    and (select public.is_admin())
  );

drop policy if exists "Admins can upload catalog item images" on storage.objects;
create policy "Admins can upload catalog item images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog-item-images'
    and (select public.is_admin())
  );

drop policy if exists "Admins can update catalog item images" on storage.objects;
create policy "Admins can update catalog item images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'catalog-item-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'catalog-item-images'
    and (select public.is_admin())
  );

drop policy if exists "Admins can delete catalog item images" on storage.objects;
create policy "Admins can delete catalog item images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'catalog-item-images'
    and (select public.is_admin())
  );
