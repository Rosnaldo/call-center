/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallStore } from '../states/call/store.ts';
import { useCurrentUserStore } from '../states/current-user/store.ts';
import { useOnlineUsersStore } from '../states/online-users/store.ts';

export const useResetSimulationState = () => {
  const resetCall = useCallStore((s) => s.resetSimulation);
  const resetOnlineUsers = useOnlineUsersStore((s) => s.resetSimulation);
  const resetCurrentUser = useCurrentUserStore((s) => s.resetSimulation);

  return () => {
    resetCall();
    resetOnlineUsers();
    resetCurrentUser();
  };
};
