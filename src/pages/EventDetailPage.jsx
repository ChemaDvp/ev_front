import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { deleteEvent, getEvent } from '../services/eventsService.js';

function DetailSection({ title, children }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </section>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [event, setEvent] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [items, setItems] = useState([]);
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getEvent(id)
      .then((result) => {
        if (!active) return;
        setEvent(result.event);
        setWorkers(result.workers);
        setItems(result.items);
        setImageError(result.imageError);
      })
      .catch((loadError) => { if (active) setError(`No se pudo cargar el evento: ${loadError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este evento? Se borrarán sus asignaciones y material asociado.')) return;
    try {
      await deleteEvent(id);
      navigate('/events', { replace: true });
    } catch (deleteError) {
      setError(`No se pudo eliminar el evento: ${deleteError.message}`);
    }
  }

  if (loading) return <p className="py-8 text-center text-muted">Cargando evento...</p>;
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!event) return <p className="text-center text-muted">Evento no encontrado.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Link className="inline-flex py-2 text-sm font-medium text-olive" to="/events">
        ← Volver a eventos
      </Link>
      <header className="rounded-3xl bg-olive p-6 text-white shadow-card">
        <p className="text-sm text-white/75">{event.location}</p>
        <h1 className="mt-1 text-2xl font-semibold">{event.event_type}</h1>
        <p className="mt-4 text-sm">
          {event.event_date} · {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}
        </p>
      </header>
      {role === 'admin' && (
        <div className="flex gap-2">
          <Link className="button-secondary" to={`/events/${id}/edit`}>Editar evento</Link>
          <button className="button-secondary text-red-700" onClick={handleDelete}>Eliminar</button>
        </div>
      )}
      <DetailSection title="Trabajadores">
        {workers.length ? workers.map((worker) => <p key={worker.id}>{worker.name}</p>) : 'Sin trabajadores asignados'}
      </DetailSection>
      {imageError && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          No se pudieron cargar algunas imágenes: {imageError}
        </p>
      )}
      <DetailSection title="Material">
        {items.some((item) => item.category === 'material') ? (
          <ul className="space-y-2">
            {items.filter((item) => item.category === 'material').map((item) => (
              <li className="flex items-center gap-3" key={item.id}>
                {item.image_url && (
                  <img
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    src={item.image_url}
                    alt={`Imagen de ${item.name}`}
                    loading="lazy"
                  />
                )}
                <span>{item.name} · {item.quantity} {item.unit}</span>
              </li>
            ))}
          </ul>
        ) : 'Sin material asignado'}
      </DetailSection>
      <DetailSection title="Decoración">
        {items.some((item) => item.category === 'decoration') ? (
          <ul className="space-y-2">
            {items.filter((item) => item.category === 'decoration').map((item) => (
              <li className="flex items-center gap-3" key={item.id}>
                {item.image_url && (
                  <img
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    src={item.image_url}
                    alt={`Imagen de ${item.name}`}
                    loading="lazy"
                  />
                )}
                <span>{item.name} · {item.quantity} {item.unit}</span>
              </li>
            ))}
          </ul>
        ) : 'Sin decoración asignada'}
      </DetailSection>
      <DetailSection title="Otros / Notas">{event.notes || 'Sin notas'}</DetailSection>
    </div>
  );
}
