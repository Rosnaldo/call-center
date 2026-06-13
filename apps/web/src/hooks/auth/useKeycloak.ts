/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useCurrentUserStore } from '../../states/current-user/store.ts';
import { OnlineUserState } from '@/src/states/online-users/state.ts';


export function useKeycloak() {
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const selectIdentity = useCallback((user: OnlineUserState | null) => {
    setCurrentUser(user);
  }, [setCurrentUser]);

  const leaveSession = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  return {
    selectIdentity,
    leaveSession
  };
}
