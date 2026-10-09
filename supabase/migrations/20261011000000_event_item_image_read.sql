grant select (id, image_path) on public.catalog_items to anon;

drop policy if exists "Guests can read catalog items used by events" on public.catalog_items;
create policy "Guests can read catalog items used by events"
  on public.catalog_items for select to anon
  using (
    exists (
      select 1
      from public.event_items
      where event_items.catalog_item_id = catalog_items.id
    )
  );

grant usage on schema storage to anon;
grant select on storage.objects to anon;

drop policy if exists "Guests can read images used by events" on storage.objects;
create policy "Guests can read images used by events"
  on storage.objects for select to anon
  using (
    bucket_id = 'catalog-item-images'
    and exists (
      select 1
      from public.catalog_items
      where catalog_items.id::text = (storage.foldername(name))[1]
        and catalog_items.image_path = name
    )
  );
