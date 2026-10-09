import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import BottomNavigation from './components/BottomNavigation.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import EventFormPage from './pages/EventFormPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StockPage from './pages/StockPage.jsx';
import WorkersPage from './pages/WorkersPage.jsx';
import { isSupabaseConfigured, supabase } from './services/supabaseClient.js';

function AppShell({ children }) {
  const { user, role, isGuest, exitGuestMode, error } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');
  const [theme, setTheme] = useState(() => (
    window.localStorage.getItem('ev-theme') === 'dark' ? 'dark' : 'light'
  ));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('ev-theme', theme);
  }, [theme]);

  async function handleSignOut() {
    if (isGuest) {
      exitGuestMode();
      navigate('/login', { replace: true });
      return;
    }
    try {
      const { error: authError } = await supabase.auth.signOut();
      if (authError) {
        setSignOutError(`No se pudo cerrar la sesión: ${authError.message}`);
        return;
      }
      setSignOutError('');
      navigate('/login', { replace: true });
    } catch (authError) {
      setSignOutError(`No se pudo cerrar la sesión: ${authError.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-4">
        {user || isGuest ? (
          <>
            <Link className="text-sm font-semibold text-olive" to="/events">EV</Link>
            <div className="flex items-center gap-3">
              <span className="text-xs capitalize text-muted">{isGuest ? 'invitado' : role || 'cargando perfil'}</span>
              <button className="text-sm font-medium text-olive" onClick={handleSignOut}>
                {isGuest ? 'Salir' : 'Cerrar sesión'}
              </button>
            </div>
          </>
        ) : <span aria-hidden="true" />}
        <button
          className="button-secondary min-h-9 px-3"
          type="button"
          aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
      </div>
      {error && (
        <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}
      {signOutError && (
        <p className="mx-auto mt-3 max-w-2xl rounded-xl bg-red-50 p-3 text-sm text-red-800">{signOutError}</p>
      )}
      <main className={`px-5 pt-4 ${user || isGuest ? 'pb-28' : 'pb-10'}`}>{children}</main>
      {(user || isGuest) && <BottomNavigation role={role} />}
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    const configurationHelp = import.meta.env.PROD
      ? 'Las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY no se incluyeron en el build de GitHub Actions. Añádelas en la configuración del repositorio y vuelve a ejecutar el despliegue.'
      : 'Crea `.env.local` a partir de `.env.example`, añade la URL y la clave pública de Supabase y reinicia el servidor de desarrollo.';
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className="max-w-md rounded-3xl bg-white p-6 shadow-card">
          <h1 className="text-xl font-semibold text-ink">Configura la conexión</h1>
          <p className="mt-2 text-sm text-muted">{configurationHelp}</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/events/new" element={<ProtectedRoute adminOnly><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/:id/edit" element={<ProtectedRoute adminOnly><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route path="/workers" element={<ProtectedRoute adminOnly><WorkersPage /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute adminOnly><CatalogPage /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute adminOnly><StockPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </AppShell>
  );
}
