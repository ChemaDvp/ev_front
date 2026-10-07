import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getEvent, saveEvent } from '../services/eventsService.js';
import { getWorkers } from '../services/workersService.js';

const emptyItem = () => ({ category: 'material', name: '', quantity: '1', unit: 'unidad' });

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({
    event_type: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [workerIds, setWorkerIds] = useState([]);
  const [items, setItems] = useState([]);
  const [eventLoaded, setEventLoaded] = useState(!id);
  const [workerLoadError, setWorkerLoadError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [workersResult, eventResult] = await Promise.allSettled([
          getWorkers(),
          id ? getEvent(id) : Promise.resolve(null),
        ]);
        if (!active) return;

        if (workersResult.status === 'fulfilled') {
          setWorkers(workersResult.value);
        } else {
          setWorkerLoadError(`No se pudieron cargar los trabajadores: ${workersResult.reason.message}`);
        }

        if (id) {
          if (eventResult.status === 'rejected') {
            setError(`No se pudo cargar el evento: ${eventResult.reason.message}`);
          } else if (!eventResult.value.event) {
            setError('No se encontró el evento solicitado.');
          } else {
            const result = eventResult.value;
            setForm({
              event_type: result.event.event_type,
              location: result.event.location,
              event_date: result.event.event_date,
              start_time: result.event.start_time.slice(0, 5),
              end_time: result.event.end_time.slice(0, 5),
              notes: result.event.notes || '',
            });
            setWorkerIds(result.workers.map((worker) => worker.id));
            setItems(result.items.map(({ category, name, quantity, unit }) => ({
              category, name, quantity: String(quantity), unit,
            })));
            setEventLoaded(true);
          }
        }
      } catch (loadError) {
        if (active) setError(`No se pudo cargar el formulario: ${loadError.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleWorker(workerId) {
    setWorkerIds((current) => current.includes(workerId)
      ? current.filter((selected) => selected !== workerId)
      : [...current, workerId]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await saveEvent(id, { ...form, created_by: user.id, workerIds, items });
      navigate('/events', { replace: true });
    } catch (saveError) {
      setError(`No se pudo guardar el evento. ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-8 text-center text-muted">Cargando formulario...</p>;
  if (id && !eventLoaded) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link className="inline-flex py-2 text-sm font-medium text-olive" to={`/events/${id}`}>
          ← Volver al evento
        </Link>
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
          {error || 'No se pudieron cargar los datos del evento.'}
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <Link className="inline-flex py-2 text-sm font-medium text-olive" to={id ? `/events/${id}` : '/events'}>
        ← Volver
      </Link>
      <h1 className="mb-5 mt-2 text-3xl font-semibold tracking-tight">
        {id ? 'Editar evento' : 'Crear evento'}
      </h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <section className="form-card space-y-4">
          <h2 className="font-semibold">Información general</h2>
          <Field label="Tipo de evento">
            <input className="field" required value={form.event_type} onChange={(e) => updateForm('event_type', e.target.value)} placeholder="Coctelería, barra libre..." />
          </Field>
          <Field label="Ubicación">
            <input className="field" required value={form.location} onChange={(e) => updateForm('location', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Fecha">
              <input className="field" type="date" required value={form.event_date} onChange={(e) => updateForm('event_date', e.target.value)} />
            </Field>
            <Field label="Desde">
              <input className="field" type="time" required value={form.start_time} onChange={(e) => updateForm('start_time', e.target.value)} />
            </Field>
            <Field label="Hasta">
              <input className="field" type="time" required value={form.end_time} onChange={(e) => updateForm('end_time', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="form-card">
          <h2 className="font-semibold">Trabajadores asignados</h2>
          {workers.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {workers.map((worker) => (
                <label className="flex min-h-12 items-center gap-3 rounded-xl bg-paper px-3 text-sm" key={worker.id}>
                  <input type="checkbox" checked={workerIds.includes(worker.id)} onChange={() => toggleWorker(worker.id)} />
                  <span>{worker.name}</span>
                </label>
              ))}
            </div>
          ) : <p className="mt-2 text-sm text-muted">Primero registra trabajadores en la pestaña Equipo.</p>}
        </section>

        <section className="form-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Material y decoración</h2>
            <button className="button-secondary" type="button" onClick={() => setItems((current) => [...current, emptyItem()])}>
              Añadir
            </button>
          </div>
          {items.length === 0 && <p className="text-sm text-muted">No hay elementos añadidos.</p>}
          {items.map((item, index) => (
            <div className="grid gap-2 rounded-2xl bg-paper p-3 sm:grid-cols-6" key={index}>
              <select className="field sm:col-span-2" aria-label="Categoría" value={item.category} onChange={(e) => updateItem(setItems, index, 'category', e.target.value)}>
                <option value="material">Material</option>
                <option value="decoration">Decoración</option>
              </select>
              <input className="field sm:col-span-2" aria-label="Nombre" placeholder="Nombre" required value={item.name} onChange={(e) => updateItem(setItems, index, 'name', e.target.value)} />
              <input className="field" aria-label="Cantidad" type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(e) => updateItem(setItems, index, 'quantity', e.target.value)} />
              <div className="flex gap-2 sm:col-span-6">
                <input className="field" aria-label="Unidad" placeholder="Unidad" value={item.unit} onChange={(e) => updateItem(setItems, index, 'unit', e.target.value)} />
                <button className="button-secondary text-red-700" type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>
              </div>
            </div>
          ))}
        </section>

        <section className="form-card">
          <Field label="Otros / Notas">
            <textarea className="field min-h-28 py-3" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} />
          </Field>
        </section>
        {(error || workerLoadError) && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            {[error, workerLoadError].filter(Boolean).join(' ')}
          </p>
        )}
        <button className="button-primary" disabled={saving || Boolean(workerLoadError)}>
          {saving ? 'Guardando...' : 'Guardar evento'}
        </button>
      </form>
    </div>
  );
}

function updateItem(setItems, index, field, value) {
  setItems((current) => current.map((item, itemIndex) => (
    itemIndex === index ? { ...item, [field]: value } : item
  )));
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
