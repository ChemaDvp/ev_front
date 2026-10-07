import { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    let profileRequest = 0;
    const loadProfile = async (nextUser) => {
      if (!active) return;
      const requestId = ++profileRequest;
      setUser(nextUser);
      setError('');
      if (!nextUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', nextUser.id)
          .single();
        if (!active || requestId !== profileRequest) return;
        if (profileError) {
          setRole(null);
          setError(`No se pudo cargar tu perfil: ${profileError.message}`);
        } else {
          setRole(data.role);
        }
      } catch (profileError) {
        if (!active || requestId !== profileRequest) return;
        setRole(null);
        setError(`No se pudo cargar tu perfil: ${profileError.message}`);
      } finally {
        if (active && requestId === profileRequest) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(`No se pudo comprobar la sesión: ${sessionError.message}`);
        setLoading(false);
        return;
      }
      void loadProfile(data.session?.user ?? null);
    }).catch((sessionError) => {
      if (!active) return;
      setError(`No se pudo comprobar la sesión: ${sessionError.message}`);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = { user, role, loading, error };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
