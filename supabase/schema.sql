create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('admin', 'worker');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.event_item_category as enum ('material', 'decoration');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'worker',
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  location text not null,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_workers (
  event_id uuid not null references public.events (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, worker_id)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  category public.event_item_category not null,
  name text not null,
  unit text not null default 'unidad',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name, unit)
);

create table if not exists public.event_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  catalog_item_id uuid references public.catalog_items (id) on delete restrict,
  category public.event_item_category not null,
  name text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text not null default 'unidad',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Preparada para habilitar el módulo de stock en una fase futura.
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity numeric(10, 2) not null default 0 check (quantity >= 0),
  unit text not null default 'unidad',
  minimum_quantity numeric(10, 2) not null default 0 check (minimum_quantity >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_event_date_idx
  on public.events (event_date);
create index if not exists event_workers_worker_id_idx
  on public.event_workers (worker_id);
create index if not exists event_items_event_id_idx
  on public.event_items (event_id);
create index if not exists event_items_catalog_item_id_idx
  on public.event_items (catalog_item_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email, 'Usuario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.app_role
  );
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at before update on public.workers
  for each row execute function public.set_updated_at();
drop trigger if exists set_event_items_updated_at on public.event_items;
create trigger set_event_items_updated_at before update on public.event_items
  for each row execute function public.set_updated_at();
drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at before update on public.catalog_items
  for each row execute function public.set_updated_at();
drop trigger if exists set_stock_items_updated_at on public.stock_items;
create trigger set_stock_items_updated_at before update on public.stock_items
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.workers enable row level security;
alter table public.event_workers enable row level security;
alter table public.event_items enable row level security;
alter table public.catalog_items enable row level security;
alter table public.stock_items enable row level security;

drop policy if exists "Users can read their own profile or admins can read all"
  on public.profiles;
create policy "Users can read their own profile or admins can read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can manage events"
  on public.events for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "Admins can manage workers" on public.workers;
create policy "Admins can manage workers"
  on public.workers for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "Admins can manage event workers" on public.event_workers;
create policy "Admins can manage event workers"
  on public.event_workers for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can manage event items" on public.event_items;
create policy "Admins can manage event items"
  on public.event_items for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "Admins can manage catalog items" on public.catalog_items;
create policy "Admins can manage catalog items"
  on public.catalog_items for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
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
drop policy if exists "Guests can read all events" on public.events;
create policy "Guests can read all events"
  on public.events for select to anon
  using (true);
drop policy if exists "Guests can read event assignments" on public.event_workers;
create policy "Guests can read event assignments"
  on public.event_workers for select to anon
  using (true);
drop policy if exists "Guests can read worker names" on public.workers;
create policy "Guests can read worker names"
  on public.workers for select to anon
  using (true);
drop policy if exists "Guests can read event items" on public.event_items;
create policy "Guests can read event items"
  on public.event_items for select to anon
  using (true);

drop policy if exists "Admins can manage stock items" on public.stock_items;
create policy "Admins can manage stock items"
  on public.stock_items for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant usage on schema public to authenticated;
grant usage on type public.app_role, public.event_item_category to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on
  public.events, public.event_workers, public.event_items, public.stock_items,
  public.catalog_items
  to authenticated;
grant select (id, name), insert, update, delete on public.workers to authenticated;
grant usage on schema public to anon;
revoke all on public.events, public.event_workers, public.workers, public.event_items
  from public, anon;
grant select (id, event_type, location, event_date, start_time, end_time, notes)
  on public.events to anon;
grant select (event_id, worker_id) on public.event_workers to anon;
grant select (id, name) on public.workers to anon;
grant select (id, event_id, catalog_item_id, category, name, quantity, unit)
  on public.event_items to anon;
grant select (id, image_path) on public.catalog_items to anon;
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

-- Ejecuta manualmente en el SQL Editor tras registrar la cuenta propietaria:
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'admin@tuempresa.com');
