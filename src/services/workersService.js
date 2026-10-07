import { supabase } from './supabaseClient.js';

export async function getWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return data;
}

export async function saveWorker(workerId, values) {
  const { data, error } = workerId
    ? await supabase.from('workers').update(values).eq('id', workerId).select('id').single()
    : await supabase.from('workers').insert(values).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteWorker(id) {
  const { error } = await supabase.from('workers').delete().eq('id', id);
  if (error) throw error;
}
