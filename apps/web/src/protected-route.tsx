import { Navigate, Outlet } from 'react-router-dom';
import { useAuthentication } from './hooks/auth/useAuthentication.ts';
import { useCurrentUserStore } from './states/stores.ts';
import { UnauthorizedView } from './components/error-view/UnauthorizedView.tsx';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthentication();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser) {
    return <UnauthorizedView />;
  }

  return <Outlet />;
}
