create or replace function public.catalog_item_is_used_by_event(p_catalog_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_items as event_item
    where event_item.catalog_item_id = p_catalog_item_id
  );
$$;

create or replace function public.event_catalog_image_is_readable(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.catalog_items as catalog_item
    join public.event_items as event_item
      on event_item.catalog_item_id = catalog_item.id
    where catalog_item.image_path = p_object_name
      and p_object_name like catalog_item.id::text || '/%'
  );
$$;

revoke all on function public.catalog_item_is_used_by_event(uuid) from public;
revoke all on function public.event_catalog_image_is_readable(text) from public;
grant execute on function public.catalog_item_is_used_by_event(uuid) to anon, authenticated;
grant execute on function public.event_catalog_image_is_readable(text) to anon, authenticated;

grant select (id, image_path) on public.catalog_items to anon;
drop policy if exists "Guests can read catalog items used by events" on public.catalog_items;
create policy "Guests can read catalog items used by events"
  on public.catalog_items for select to anon
  using ((select public.catalog_item_is_used_by_event(id)));

grant usage on schema storage to anon;
grant select on storage.objects to anon;
drop policy if exists "Guests can read images used by events" on storage.objects;
create policy "Guests can read images used by events"
  on storage.objects for select to anon
  using (
    bucket_id = 'catalog-item-images'
    and (select public.event_catalog_image_is_readable(name))
  );
