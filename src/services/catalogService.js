import { supabase } from './supabaseClient.js';

export async function getCatalogItems() {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('id, category, name, unit')
    .order('category')
    .order('name');
  if (error) throw error;
  return data;
}

export async function saveCatalogItem(itemId, values) {
  const { data, error } = itemId
    ? await supabase.from('catalog_items').update(values).eq('id', itemId).select('id').single()
    : await supabase.from('catalog_items').insert(values).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteCatalogItem(id) {
  const { error } = await supabase.from('catalog_items').delete().eq('id', id);
  if (error) throw error;
}
