import { Navigate, Outlet } from 'react-router-dom';
import { useAuthentication } from './hooks/auth/useAuthentication.ts';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthentication();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
