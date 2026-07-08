/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import { useAuthentication } from './useAuthentication.ts';
import { initWs } from '../../services/ws/init-ws.ts';
import { DailyService } from '../../services/daily.ts';

export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuthentication();

  return () => {
    // rebuild, not destroy: App stays mounted across logout, so a future
    // login in the same tab needs a live call object, not a dead one.
    DailyService.getInstance().rebuild();
    initWs.notifyLogout();

    logout();
    navigate('/login');
  };
}
