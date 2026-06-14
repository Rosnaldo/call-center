import { Navigate, Outlet } from 'react-router-dom';
import { useAuthentication } from './hooks/auth/useAuthentication.ts';
import { useCurrentUserStore } from './states/current-user/store.ts';
import { UnauthorizedView } from './components/error-view/UnauthorizedView.tsx';
import { UserRole } from '@repo/shared-types';

interface RoleProtectedRouteProps {
  allowedRoles: Array<keyof typeof UserRole>;
}

export function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const { isAuthenticated } = useAuthentication();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser) {
    return <UnauthorizedView />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <UnauthorizedView />;
  }

  return <Outlet />;
}
