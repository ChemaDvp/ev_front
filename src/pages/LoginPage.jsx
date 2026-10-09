import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient.js';

export default function LoginPage() {
  const { user, isGuest, enterGuestMode, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
  if (user || isGuest) return <Navigate to="/events" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('No se pudo iniciar sesión. Comprueba el correo y la contraseña.');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profileError || profile.role !== 'admin') {
        await supabase.auth.signOut();
        setError(profileError
          ? `No se pudo validar el perfil: ${profileError.message}`
          : 'Esta cuenta no está configurada como administrador.');
        return;
      }
      navigate('/events', { replace: true });
    } catch (signInError) {
      setError(`No se pudo completar el inicio de sesión: ${signInError.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center px-5 py-8">
      <section className="w-full rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-olive">Eventos Vidal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Bienvenido</h1>
          <p className="mt-2 text-sm text-muted">Accede como administrador o consulta los eventos como invitado.</p>
        </div>
        {!isSupabaseConfigured ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Falta configurar la URL y la clave pública de Supabase en el archivo `.env.local`.
          </p>
        ) : (
          <div className="space-y-5">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-ink">
                Correo electrónico
                <input
                  className="field mt-2"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Contraseña
                <input
                  className="field mt-2"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button className="button-primary w-full" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar como administrador'}
              </button>
            </form>
            <div className="relative py-1 text-center text-xs text-muted">
              <span className="bg-white px-3">o</span>
              <span className="absolute left-0 right-0 top-1/2 -z-10 border-t border-stone-200" />
            </div>
            <button
              className="button-secondary w-full min-h-12"
              type="button"
              onClick={() => {
                enterGuestMode();
                navigate('/events', { replace: true });
              }}
            >
              Entrar como invitado
            </button>
            <p className="text-center text-xs text-muted">
              El acceso de invitado solo permite visualizar eventos.
            </p>
            <p className="text-center text-xs text-muted">Desarrollado por chemadvp · v1.1.0</p>
          </div>
        )}
      </section>
    </main>
  );
}
