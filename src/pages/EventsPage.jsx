import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getEvents } from '../services/eventsService.js';

function formatDate(date) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));
}

function getEventEndTimestamp(event) {
  return new Date(`${event.event_date}T${event.end_time.slice(0, 5)}:00`).getTime();
}

export default function EventsPage() {
  const { role } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedList, setSelectedList] = useState('upcoming');
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { upcomingEvents, completedEvents } = useMemo(() => {
    const upcoming = [];
    const completed = [];
    for (const event of events) {
      (getEventEndTimestamp(event) <= now ? completed : upcoming).push(event);
    }
    completed.sort((first, second) => (
      getEventEndTimestamp(second) - getEventEndTimestamp(first)
    ));
    return { upcomingEvents: upcoming, completedEvents: completed };
  }, [events, now]);

  useEffect(() => {
    let active = true;
    getEvents()
      .then((data) => { if (active) setEvents(data); })
      .catch((queryError) => { if (active) setError(`No se pudieron cargar los eventos: ${queryError.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refreshTime = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(refreshTime);
  }, []);

  const visibleEvents = selectedList === 'upcoming' ? upcomingEvents : completedEvents;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-olive">Eventos Vidal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Eventos</h1>
        </div>
        {role === 'admin' && (
          <Link className="button-primary !w-auto px-4" to="/events/new">
            Nuevo
          </Link>
        )}
      </header>
      {loading && <p className="py-8 text-center text-muted">Cargando eventos...</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!loading && !error && (
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-stone-100 p-1" role="tablist" aria-label="Listas de eventos">
          <button
            className={`min-h-11 rounded-xl px-3 text-sm font-medium transition ${
              selectedList === 'upcoming' ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
            type="button"
            role="tab"
            aria-selected={selectedList === 'upcoming'}
            onClick={() => setSelectedList('upcoming')}
          >
            Próximos ({upcomingEvents.length})
          </button>
          <button
            className={`min-h-11 rounded-xl px-3 text-sm font-medium transition ${
              selectedList === 'completed' ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
            type="button"
            role="tab"
            aria-selected={selectedList === 'completed'}
            onClick={() => setSelectedList('completed')}
          >
            Realizados ({completedEvents.length})
          </button>
        </div>
      )}
      {!loading && !error && events.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-card">
          <p className="font-medium text-ink">Todavía no hay eventos</p>
          <p className="mt-1 text-sm text-muted">
            {role === 'admin' ? 'Cuando crees uno, aparecerá aquí.' : 'No hay eventos disponibles.'}
          </p>
        </div>
      )}
      {!loading && !error && events.length > 0 && visibleEvents.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-card">
          <p className="font-medium text-ink">
            {selectedList === 'upcoming' ? 'No hay eventos próximos' : 'Todavía no hay eventos realizados'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {selectedList === 'upcoming'
              ? 'Los eventos aparecerán aquí hasta que finalice su hora.'
              : 'Los eventos pasarán aquí automáticamente al terminar.'}
          </p>
        </div>
      )}
      <div className="space-y-3">
        {visibleEvents.map((item) => (
          <Link
            className="block rounded-3xl bg-white p-5 shadow-card transition hover:-translate-y-0.5"
            key={item.id}
            to={`/events/${item.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{item.event_type}</p>
                <p className="mt-1 text-sm text-muted">{item.location}</p>
              </div>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium capitalize text-olive">
                {formatDate(item.event_date)}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted">
              {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
            </p>
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">Trabajadores: </span>
              {item.workers.length ? item.workers.map((worker) => worker.name).join(', ') : 'Sin trabajadores asignados'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
