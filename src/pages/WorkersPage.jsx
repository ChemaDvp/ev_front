import { useCallback, useEffect, useState } from 'react';
import { deleteWorker, getWorkers, saveWorker } from '../services/workersService.js';

const blankWorker = { name: '' };

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState(blankWorker);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setWorkers(await getWorkers());
  }, []);

  useEffect(() => {
    let active = true;
    getWorkers()
      .then((rows) => { if (active) setWorkers(rows); })
      .catch((loadError) => { if (active) setError(`No se pudieron cargar los trabajadores: ${loadError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startEdit(worker) {
    setEditingId(worker.id);
    setForm({ name: worker.name });
    setNotice('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankWorker);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await saveWorker(editingId, { name: form.name.trim() });
      resetForm();
      await refresh();
      setNotice(editingId ? 'Trabajador actualizado.' : 'Trabajador creado. Ya puedes asignarlo a uno o varios eventos.');
    } catch (saveError) {
      setError(`No se pudo guardar el trabajador: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(worker) {
    if (!window.confirm(`¿Eliminar a ${worker.name}? Se quitarán sus asignaciones a eventos.`)) return;
    setError('');
    try {
      await deleteWorker(worker.id);
      await refresh();
      setNotice('Trabajador eliminado.');
    } catch (deleteError) {
      setError(`No se pudo eliminar al trabajador: ${deleteError.message}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5">
        <p className="text-sm font-medium text-olive">Administración</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Equipo</h1>
      </header>
      <form className="form-card mb-5 space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-semibold">{editingId ? 'Editar trabajador' : 'Añadir trabajador'}</h2>
        <label className="block space-y-2 text-sm font-medium">
          Nombre
          <input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="flex gap-2">
          <button className="button-primary" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Añadir trabajador'}</button>
          {editingId && <button className="button-secondary" type="button" onClick={resetForm}>Cancelar</button>}
        </div>
      </form>
      {error && <p className="mb-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p className="mb-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      <h2 className="mb-3 font-semibold">Trabajadores registrados</h2>
      {loading && <p className="py-6 text-center text-muted">Cargando equipo...</p>}
      {!loading && workers.length === 0 && <p className="form-card text-sm text-muted">Aún no hay trabajadores registrados.</p>}
      <div className="space-y-3">
        {workers.map((worker) => (
          <article className="rounded-3xl bg-white p-5 shadow-card" key={worker.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{worker.name}</h3>
              </div>
              <button className="text-sm font-medium text-olive" onClick={() => startEdit(worker)}>Editar</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="button-secondary text-red-700" onClick={() => handleDelete(worker)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
