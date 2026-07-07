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
    DailyService.getInstance().destroy();
    initWs.notifyLogout();

    logout();
    navigate('/login');
  };
}
