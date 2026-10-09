import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getEvent, saveEvent } from '../services/eventsService.js';
import { getCatalogItems } from '../services/catalogService.js';
import { getWorkers } from '../services/workersService.js';

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
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
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [workersResult, catalogResult, eventResult] = await Promise.allSettled([
          getWorkers(),
          getCatalogItems(),
          id ? getEvent(id) : Promise.resolve(null),
        ]);
        if (!active) return;

        const loadErrors = [];
        if (workersResult.status === 'fulfilled') setWorkers(workersResult.value);
        else loadErrors.push(`No se pudieron cargar los trabajadores: ${workersResult.reason.message}`);
        if (catalogResult.status === 'fulfilled') setCatalogItems(catalogResult.value);
        else loadErrors.push(`No se pudo cargar el catálogo: ${catalogResult.reason.message}`);
        setLoadError(loadErrors.join(' '));

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
            setItems(result.items.map(({ catalog_item_id, category, name, quantity, unit }) => ({
              category,
              name,
              quantity: String(Number(quantity)),
              unit,
              catalog_item_id,
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

  function toggleCatalogItem(catalogItem) {
    setItems((current) => current.some((item) => item.catalog_item_id === catalogItem.id)
      ? current.filter((item) => item.catalog_item_id !== catalogItem.id)
      : [...current, {
        catalog_item_id: catalogItem.id,
        category: catalogItem.category,
        name: catalogItem.name,
        quantity: '1',
        unit: catalogItem.unit,
      }]);
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
          </div>
          {catalogItems.length === 0 && <p className="text-sm text-muted">Añade primero elementos en la pestaña Catálogo.</p>}
          {['material', 'decoration'].map((category) => {
            const categoryItems = catalogItems.filter((item) => item.category === category);
            if (!categoryItems.length) return null;
            return (
              <div className="space-y-2" key={category}>
                <h3 className="text-sm font-medium text-muted">{category === 'material' ? 'Material' : 'Decoración'}</h3>
                {categoryItems.map((catalogItem) => {
                  const selectedItem = items.find((item) => item.catalog_item_id === catalogItem.id);
                  return (
                    <div className="rounded-2xl bg-paper p-3" key={catalogItem.id}>
                      <label className="flex min-h-10 items-center gap-3 text-sm">
                        <input type="checkbox" checked={Boolean(selectedItem)} onChange={() => toggleCatalogItem(catalogItem)} />
                        <span>{catalogItem.name}</span>
                      </label>
                      {selectedItem && (
                        <div className="mt-2">
                          <label className="block space-y-2 text-sm font-medium">
                            Cantidad
                            <select
                              className="field"
                              aria-label={`Cantidad de ${catalogItem.name}`}
                              value={String(selectedItem.quantity)}
                              onChange={(e) => updateItem(setItems, items.indexOf(selectedItem), 'quantity', e.target.value)}
                            >
                              {(!Number.isInteger(Number(selectedItem.quantity)) || Number(selectedItem.quantity) < 1 || Number(selectedItem.quantity) > 99) && (
                                <option value={String(selectedItem.quantity)}>{selectedItem.quantity} (actual)</option>
                              )}
                              {Array.from({ length: 99 }, (_, index) => index + 1).map((quantity) => (
                                <option key={quantity} value={String(quantity)}>{quantity}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>

        <section className="form-card">
          <Field label="Otros / Notas">
            <textarea className="field min-h-28 py-3" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} />
          </Field>
        </section>
        {(error || loadError) && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            {[error, loadError].filter(Boolean).join(' ')}
          </p>
        )}
        <button className="button-primary" disabled={saving || Boolean(loadError)}>
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
