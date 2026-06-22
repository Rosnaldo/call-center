/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallStore, useCurrentUserStore, useOnlineUsersStore, useCallViewStore, useIncomingCallStore, useTimerStore, useBillingStore } from '../states/stores.ts';

export const useResetSimulationState = () => {
  const resetCall = useCallStore((s) => s.resetSimulation);
  const resetOnlineUsers = useOnlineUsersStore((s) => s.resetSimulation);
  const resetCurrentUser = useCurrentUserStore((s) => s.resetSimulation);
  const resetCallView = useCallViewStore((s) => s.resetCallViewState);
  const incomingCallCancelled = useIncomingCallStore((s) => s.incomingCallCancelled);
  const resetTimer = useTimerStore((s) => s.reset);
  const resetBilling = useBillingStore((s) => s.resetSimulation);

  return () => {
    resetCall();
    resetOnlineUsers();
    resetCurrentUser();
    resetCallView();
    incomingCallCancelled();
    resetTimer();
    resetBilling();
  };
};
