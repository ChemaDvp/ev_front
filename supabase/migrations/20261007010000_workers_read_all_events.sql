create or replace function public.is_worker()
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
      and p.role = 'worker'::public.app_role
  );
$$;

revoke all on function public.is_worker() from public, anon;
grant execute on function public.is_worker() to authenticated;

drop policy if exists "Assigned workers can read events" on public.events;
drop policy if exists "Authenticated workers can read all events" on public.events;
create policy "Authenticated workers can read all events"
  on public.events for select to authenticated
  using ((select public.is_worker()));

drop policy if exists "Workers can read coworkers on shared events" on public.workers;
drop policy if exists "Workers can read workers for all events" on public.workers;
create policy "Workers can read workers for all events"
  on public.workers for select to authenticated
  using ((select public.is_worker()));

drop policy if exists "Assigned workers can read event workers" on public.event_workers;
drop policy if exists "Workers can read assignments for all events" on public.event_workers;
create policy "Workers can read assignments for all events"
  on public.event_workers for select to authenticated
  using ((select public.is_worker()));

drop policy if exists "Assigned workers can read event items" on public.event_items;
drop policy if exists "Workers can read items for all events" on public.event_items;
create policy "Workers can read items for all events"
  on public.event_items for select to authenticated
  using ((select public.is_worker()));

revoke select on public.workers from authenticated;
grant select (id, name) on public.workers to authenticated;

drop function if exists public.can_view_event(uuid);
