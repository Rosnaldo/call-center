import { Navigate, Outlet } from 'react-router-dom';
import { UserRole } from '@repo/shared-types';
import { useAuth } from './providers/auth-provider';
import { useCurrentUser } from './hooks/use-current-user';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const { data: currentUser, isLoading, isError } = useCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (isError || currentUser?.role !== UserRole.admin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
