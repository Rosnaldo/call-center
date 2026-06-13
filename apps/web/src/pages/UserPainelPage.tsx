import { Navigate } from 'react-router-dom';
import { useCurrentUserStore } from '../states/current-user/store.ts';

export function UserPainelPage() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'customer') {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/attendant" replace />;
}
