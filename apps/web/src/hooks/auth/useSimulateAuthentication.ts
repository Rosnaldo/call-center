/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { useCurrentUserStore } from '../../states/current-user/store.ts';

export function useSimulateAuthentication() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const isAuthenticated = currentUser !== null;

  const login = useCallback(() => {}, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  return {
    login,
    logout,
    isAuthenticated,
  };
}
