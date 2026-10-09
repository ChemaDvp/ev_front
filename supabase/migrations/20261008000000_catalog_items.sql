do $$
begin
  create type public.event_item_category as enum ('material', 'decoration');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category public.event_item_category not null,
  name text not null,
  unit text not null default 'unidad',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name, unit)
);

alter table public.event_items
  add column if not exists catalog_item_id uuid
  references public.catalog_items (id) on delete restrict;

insert into public.catalog_items (category, name, unit)
select distinct category::text::public.event_item_category, name, unit
from public.event_items
on conflict (category, name, unit) do nothing;

update public.event_items as event_item
set catalog_item_id = catalog_item.id
from public.catalog_items as catalog_item
where event_item.catalog_item_id is null
  and event_item.category::text = catalog_item.category::text
  and event_item.name = catalog_item.name
  and event_item.unit = catalog_item.unit;

drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at before update on public.catalog_items
  for each row execute function public.set_updated_at();

alter table public.catalog_items enable row level security;
drop policy if exists "Admins can manage catalog items" on public.catalog_items;
create policy "Admins can manage catalog items"
  on public.catalog_items for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update, delete on public.catalog_items to authenticated;

create or replace function public.save_event(
  p_event_id uuid,
  p_event jsonb,
  p_worker_ids uuid[],
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_event_id uuid;
begin
  if not coalesce((select public.is_admin()), false) then
    raise exception 'Solo un administrador puede guardar eventos.'
      using errcode = '42501';
  end if;

  if p_event_id is null then
    insert into public.events (
      event_type, location, event_date, start_time, end_time, notes, created_by
    )
    values (
      nullif(trim(p_event ->> 'event_type'), ''),
      nullif(trim(p_event ->> 'location'), ''),
      (p_event ->> 'event_date')::date,
      (p_event ->> 'start_time')::time,
      (p_event ->> 'end_time')::time,
      coalesce(p_event ->> 'notes', ''),
      (p_event ->> 'created_by')::uuid
    )
    returning id into saved_event_id;
  else
    update public.events as e
    set event_type = nullif(trim(p_event ->> 'event_type'), ''),
        location = nullif(trim(p_event ->> 'location'), ''),
        event_date = (p_event ->> 'event_date')::date,
        start_time = (p_event ->> 'start_time')::time,
        end_time = (p_event ->> 'end_time')::time,
        notes = coalesce(p_event ->> 'notes', ''),
        updated_at = now()
    where e.id = p_event_id
    returning e.id into saved_event_id;

    if saved_event_id is null then
      raise exception 'No se encontró el evento que quieres editar.'
        using errcode = 'P0002';
    end if;
  end if;

  delete from public.event_workers where event_id = saved_event_id;
  delete from public.event_items where event_id = saved_event_id;

  insert into public.event_workers (event_id, worker_id)
  select saved_event_id, worker_id
  from unnest(coalesce(p_worker_ids, array[]::uuid[])) as assigned(worker_id);

  insert into public.event_items (event_id, catalog_item_id, category, name, quantity, unit)
  select saved_event_id,
         item.catalog_item_id,
         item.category::public.event_item_category,
         trim(item.name),
         item.quantity,
         coalesce(nullif(trim(item.unit), ''), 'unidad')
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb))
    as item(catalog_item_id uuid, category text, name text, quantity numeric, unit text)
  where nullif(trim(item.name), '') is not null;

  return saved_event_id;
end;
$$;

revoke all on function public.save_event(uuid, jsonb, uuid[], jsonb) from public, anon;
grant execute on function public.save_event(uuid, jsonb, uuid[], jsonb) to authenticated;
