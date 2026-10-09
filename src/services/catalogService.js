import { supabase } from './supabaseClient.js';

const IMAGE_BUCKET = 'catalog-item-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function getCatalogItems({ includeImages = false } = {}) {
  const { data, error } = await supabase
    .from('catalog_items')
    .select('id, category, name, unit, image_path')
    .order('category')
    .order('name');
  if (error) throw error;

  const itemsWithImages = data.filter((item) => item.image_path);
  if (!includeImages || !itemsWithImages.length) return data;

  const { data: signedImages, error: imageError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(itemsWithImages.map((item) => item.image_path), 3600);
  if (imageError) throw imageError;
  const failedImage = signedImages.find((image) => image.error);
  if (failedImage) throw new Error(`No se pudo obtener una imagen del catálogo: ${failedImage.error}`);

  const imageUrls = new Map(signedImages.map((image) => [image.path, image.signedUrl]));
  return data.map((item) => ({ ...item, image_url: imageUrls.get(item.image_path) || null }));
}

export async function saveCatalogItem(itemId, values) {
  const { data, error } = itemId
    ? await supabase.from('catalog_items').update(values).eq('id', itemId).select('id').single()
    : await supabase.from('catalog_items').insert(values).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function uploadCatalogItemImage(itemId, file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato no admitido. Usa una imagen JPG, PNG, WebP, GIF o AVIF.');
  }
  if (file.size > MAX_IMAGE_SIZE) throw new Error('La imagen no puede superar los 5 MB.');

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'image';
  const imagePath = `${itemId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: currentError } = await supabase
    .from('catalog_items')
    .select('image_path')
    .eq('id', itemId)
    .single();
  if (currentError) {
    const { error: cleanupError } = await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
    if (cleanupError) throw new Error(`${currentError.message} Además, no se pudo limpiar la imagen subida: ${cleanupError.message}`);
    throw currentError;
  }

  const { error: updateError } = await supabase
    .from('catalog_items')
    .update({ image_path: imagePath })
    .eq('id', itemId);
  if (updateError) {
    const { error: cleanupError } = await supabase.storage.from(IMAGE_BUCKET).remove([imagePath]);
    if (cleanupError) throw new Error(`${updateError.message} Además, no se pudo limpiar la imagen subida: ${cleanupError.message}`);
    throw updateError;
  }

  if (data.image_path) {
    const { error: removeError } = await supabase.storage.from(IMAGE_BUCKET).remove([data.image_path]);
    if (removeError) throw new Error(`La imagen nueva se guardó, pero no se pudo retirar la anterior: ${removeError.message}`);
  }
}

export async function deleteCatalogItem(id) {
  const { data: item, error: fetchError } = await supabase
    .from('catalog_items')
    .select('image_path')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase.from('catalog_items').delete().eq('id', id);
  if (error) throw error;

  if (item.image_path) {
    const { error: imageError } = await supabase.storage.from(IMAGE_BUCKET).remove([item.image_path]);
    if (imageError) throw new Error(`El elemento se eliminó, pero no se pudo borrar su imagen: ${imageError.message}`);
  }
}
