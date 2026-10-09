import { useCallback, useEffect, useState } from 'react';
import { deleteCatalogItem, getCatalogItems, saveCatalogItem, uploadCatalogItemImage } from '../services/catalogService.js';

const blankItem = { category: 'material', name: '' };

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankItem);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setItems(await getCatalogItems({ includeImages: true }));
  }, []);

  useEffect(() => {
    let active = true;
    getCatalogItems({ includeImages: true })
      .then((rows) => { if (active) setItems(rows); })
      .catch((loadError) => { if (active) setError(`No se pudo cargar el catálogo: ${loadError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ category: item.category, name: item.name });
    setImageFile(null);
    setNotice('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankItem);
    setImageFile(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (imageFile && !imageFile.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen.');
      }
      if (imageFile && imageFile.size > 5 * 1024 * 1024) {
        throw new Error('La imagen no puede superar los 5 MB.');
      }
      const itemId = await saveCatalogItem(editingId, {
        ...form,
        name: form.name.trim(),
      });
      if (imageFile) {
        try {
          await uploadCatalogItemImage(itemId, imageFile);
        } catch (imageError) {
          setEditingId(itemId);
          setError(`El elemento se guardó, pero no se pudo guardar su imagen: ${imageError.message}`);
          return;
        }
      }
      resetForm();
      await refresh();
      setNotice(editingId ? 'Elemento actualizado.' : 'Elemento creado. Ya puedes asignarlo a los eventos.');
    } catch (saveError) {
      setError(`No se pudo guardar el elemento: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`¿Eliminar ${item.name} del catálogo?`)) return;
    setError('');
    try {
      await deleteCatalogItem(item.id);
      await refresh();
      setNotice('Elemento eliminado.');
    } catch (deleteError) {
      setError(`No se pudo eliminar el elemento. Puede estar asignado a uno o varios eventos. ${deleteError.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="text-sm font-medium text-olive">Administración</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo</h1>
        <p className="mt-2 text-sm text-muted">Gestiona los elementos reutilizables de material y decoración.</p>
      </header>
      <form className="form-card mb-5 space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-semibold">{editingId ? 'Editar elemento' : 'Añadir elemento'}</h2>
        <label className="block space-y-2 text-sm font-medium">
          Categoría
          <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="material">Material</option>
            <option value="decoration">Decoración</option>
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Nombre
          <input className="field" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <div className="space-y-2">
          <span className="block text-sm font-medium">Imagen (opcional)</span>
          <label className="button-secondary w-fit cursor-pointer">
            Adjuntar imagen
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
          </label>
          {imageFile && <p className="text-xs text-muted">{imageFile.name}</p>}
          <p className="text-xs text-muted">Imágenes de hasta 5 MB. Solo aparecerá en este catálogo.</p>
        </div>
        <div className="flex gap-2">
          <button className="button-primary" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Añadir al catálogo'}</button>
          {editingId && <button className="button-secondary" type="button" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>
      {error && <p className="mb-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p className="mb-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      <h2 className="mb-3 font-semibold">Elementos registrados</h2>
      {loading && <p className="py-6 text-center text-muted">Cargando catálogo...</p>}
      {!loading && items.length === 0 && <p className="form-card text-sm text-muted">Aún no hay elementos en el catálogo.</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <article className="rounded-3xl bg-white p-5 shadow-card" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-words font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm capitalize text-muted">{item.category === 'decoration' ? 'Decoración' : 'Material'}</p>
              </div>
              {item.image_url && (
                <img
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  src={item.image_url}
                  alt={`Imagen de ${item.name}`}
                  loading="lazy"
                />
              )}
              <button className="text-sm font-medium text-olive" onClick={() => startEdit(item)}>Editar</button>
            </div>
            <div className="mt-4">
              <button className="button-secondary text-red-700" onClick={() => handleDelete(item)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
