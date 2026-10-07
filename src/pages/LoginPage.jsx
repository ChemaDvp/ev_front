import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient.js';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
  if (user) return <Navigate to="/events" replace />;

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
      if (profileError || profile.role !== loginRole) {
        await supabase.auth.signOut();
        setError(profileError
          ? `No se pudo validar el perfil: ${profileError.message}`
          : loginRole === 'worker'
            ? 'Esta cuenta no está configurada como trabajador.'
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
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="w-full rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-olive">Eventos Vidal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Bienvenido</h1>
          <p className="mt-2 text-sm text-muted">Consulta los eventos o gestiona la organización.</p>
        </div>
        {!isSupabaseConfigured ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Falta configurar la URL y la clave pública de Supabase en el archivo `.env.local`.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 rounded-2xl bg-paper p-1">
              {[
                ['admin', 'Administrador'],
                ['worker', 'Trabajador'],
              ].map(([role, label]) => (
                <button
                  className={`min-h-11 rounded-xl text-sm font-medium ${
                    loginRole === role ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                  key={role}
                  type="button"
                  onClick={() => setLoginRole(role)}
                >
                  {role === 'worker' ? 'Entrar como trabajador' : label}
                </button>
              ))}
            </div>
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
              {submitting ? 'Entrando...' : loginRole === 'worker' ? 'Entrar como trabajador' : 'Entrar'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
