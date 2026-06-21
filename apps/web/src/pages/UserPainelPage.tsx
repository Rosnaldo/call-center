import { Navigate } from 'react-router-dom';
import { useCurrentUserStore } from '../states/stores.ts';

export function UserPainelPage() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  if (currentUser?.role === 'customer') {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/attendant" replace />;
}
