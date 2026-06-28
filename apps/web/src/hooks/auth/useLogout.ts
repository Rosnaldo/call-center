/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import { useAuthentication } from './useAuthentication.ts';
import { useCurrentUserStore, useOnlineUsersStore } from '../../states/stores.ts';
import { initWs } from '../../services/ws/init-ws.ts';
import { DailyService } from '../../services/daily.ts';
import properties from '../../properties';

export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuthentication();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const removeFromOnlineUsers = useOnlineUsersStore((s) => s.removeFromOnlineUsers);

  return () => {
    DailyService.getInstance().destroy();
    initWs.notifyLogout();

    if (!properties.isSimulation) {
      removeFromOnlineUsers(currentUser?.id || '');
    }
    logout();
    navigate('/login');
  };
}
