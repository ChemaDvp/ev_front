import { NavLink } from 'react-router-dom';

export default function BottomNavigation({ role }) {
  const links = [
    { to: '/events', label: 'Eventos', icon: '▦' },
    ...(role === 'admin' ? [{ to: '/workers', label: 'Equipo', icon: '♙' }] : []),
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {links.map(({ to, label, icon }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-w-24 flex-col items-center gap-1 rounded-xl px-4 py-1 text-xs font-medium ${
                isActive ? 'text-olive' : 'text-muted'
              }`
            }
            key={to}
            to={to}
          >
            <span className="text-xl leading-6" aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
