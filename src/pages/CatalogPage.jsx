import { useCallback, useEffect, useState } from 'react';
import { deleteCatalogItem, getCatalogItems, saveCatalogItem } from '../services/catalogService.js';

const blankItem = { category: 'material', name: '' };

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankItem);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setItems(await getCatalogItems());
  }, []);

  useEffect(() => {
    let active = true;
    getCatalogItems()
      .then((rows) => { if (active) setItems(rows); })
      .catch((loadError) => { if (active) setError(`No se pudo cargar el catálogo: ${loadError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ category: item.category, name: item.name });
    setNotice('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankItem);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveCatalogItem(editingId, {
        ...form,
        name: form.name.trim(),
      });
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm capitalize text-muted">{item.category === 'decoration' ? 'Decoración' : 'Material'}</p>
              </div>
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
