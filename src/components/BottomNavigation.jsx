import { NavLink } from 'react-router-dom';

function NavigationIcon({ name }) {
  const common = {
    className: 'h-6 w-6',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  if (name === 'events') {
    return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" /></svg>;
  }
  if (name === 'workers') {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  if (name === 'catalog') {
    return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
  }
  return <svg {...common}><path d="M4 21V8l8-5 8 5v13M2 21h20M9 21v-6h6v6M8 10h.01M16 10h.01" /></svg>;
}

export default function BottomNavigation({ role }) {
  const links = [
    { to: '/events', label: 'Eventos', icon: 'events' },
    ...(role === 'admin' ? [{ to: '/workers', label: 'Equipo', icon: 'workers' }] : []),
    ...(role === 'admin' ? [{ to: '/catalog', label: 'Catálogo', icon: 'catalog' }] : []),
  ];
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-center gap-3">
        {links.map(({ to, label, icon }) => (
          <NavLink
            className={({ isActive }) =>
              `flex h-12 w-14 items-center justify-center rounded-xl transition ${
                isActive ? 'bg-paper text-olive' : 'text-muted hover:bg-paper'
              }`
            }
            aria-label={label}
            key={to}
            to={to}
            title={label}
          >
            <NavigationIcon name={icon} />
          </NavLink>
        ))}
        {role === 'admin' && (
          <button
            className="flex h-12 w-14 cursor-not-allowed items-center justify-center rounded-xl text-stone-400"
            type="button"
            disabled
            aria-label="Almacén, próximamente"
            title="Almacén, próximamente"
          >
            <NavigationIcon name="stock" />
          </button>
        )}
      </div>
    </nav>
  );
}
