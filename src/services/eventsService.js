import { supabase } from './supabaseClient.js';

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, event_type, location, event_date, start_time, end_time, event_workers(workers(name))')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data.map((event) => ({
    ...event,
    workers: (event.event_workers || []).map(({ workers }) => workers).filter(Boolean),
  }));
}

export async function getEvent(id) {
  const [eventResult, workersResult, itemsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, event_type, location, event_date, start_time, end_time, notes')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('event_workers').select('workers(id, name)').eq('event_id', id),
    supabase.from('event_items').select('id, catalog_item_id, category, name, quantity, unit').eq('event_id', id),
  ]);
  if (eventResult.error) throw eventResult.error;
  if (workersResult.error) throw workersResult.error;
  if (itemsResult.error) throw itemsResult.error;
  return {
    event: eventResult.data,
    workers: workersResult.data.map(({ workers }) => workers).filter(Boolean),
    items: itemsResult.data,
  };
}

export async function saveEvent(eventId, values) {
  const { workerIds, items, ...eventValues } = values;
  const { data, error } = await supabase.rpc('save_event', {
    p_event_id: eventId || null,
    p_event: eventValues,
    p_worker_ids: workerIds,
    p_items: items.filter((item) => item.name.trim()).map((item) => ({
      ...item,
      catalog_item_id: item.catalog_item_id || null,
      name: item.name.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim() || 'unidad',
    })),
  });
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
