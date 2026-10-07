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

drop policy if exists "Assigned workers can read events" on public.events;
drop policy if exists "Authenticated workers can read all events" on public.events;
drop policy if exists "Workers can read coworkers on shared events" on public.workers;
drop policy if exists "Workers can read workers for all events" on public.workers;
drop policy if exists "Assigned workers can read event assignments" on public.event_workers;
drop policy if exists "Assigned workers can read event workers" on public.event_workers;
drop policy if exists "Workers can read assignments for all events" on public.event_workers;
drop policy if exists "Assigned workers can read event items" on public.event_items;
drop policy if exists "Workers can read items for all events" on public.event_items;

grant usage on schema public to anon;
revoke all on public.events, public.event_workers, public.workers, public.event_items
  from public, anon;
revoke select on public.workers from authenticated;
grant select (id, name) on public.workers to authenticated;
grant select (id, event_type, location, event_date, start_time, end_time, notes)
  on public.events to anon;
grant select (event_id, worker_id) on public.event_workers to anon;
grant select (id, name) on public.workers to anon;
grant select (id, event_id, category, name, quantity, unit) on public.event_items to anon;

drop function if exists public.is_worker();
drop function if exists public.can_view_event(uuid);
