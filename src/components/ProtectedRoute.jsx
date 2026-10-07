import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PermissionDenied from './PermissionDenied.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, isGuest, loading } = useAuth();

  if (loading) return <p className="py-12 text-center text-muted">Cargando...</p>;
  if (!user && !isGuest) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <PermissionDenied />;
  return children;
}
