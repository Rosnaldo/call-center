import { Navigate, Outlet } from 'react-router-dom';
import { useAuthentication } from './hooks/auth/useAuthentication.ts';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthentication();
  console.log(`ProtectedRoute: isAuthenticated=${isAuthenticated}`);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
