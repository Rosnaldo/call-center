/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import { useAuthentication } from './useAuthentication.ts';
import { useCurrentUserStore } from '../../states/current-user/store.ts';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { notifyWsLogout } from '../useOnlineUsersWebSocket.ts';

export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuthentication();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const removeUser = useOnlineUsersStore((s) => s.removeUser);

  return () => {
    notifyWsLogout();

    const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';
    if (!isSimulation) {
      removeUser(currentUser?.id || '');
    }
    logout();
    navigate('/login');
  };
}
