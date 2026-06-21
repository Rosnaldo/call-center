/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallStore } from '../states/call/store.ts';
import { useCurrentUserStore } from '../states/current-user/store.ts';
import { useOnlineUsersStore } from '../states/online-users/store.ts';
import { useCallViewStore } from '../states/call-view/store.ts';
import { useIncomingCallStore } from '../states/incoming-call/store.ts';
import { useTimerStore } from '../states/timer/store.ts';
import { useBillingStore } from '../states/billing/store.ts';

export const useResetSimulationState = () => {
  const resetCall = useCallStore((s) => s.resetSimulation);
  const resetOnlineUsers = useOnlineUsersStore((s) => s.resetSimulation);
  const resetCurrentUser = useCurrentUserStore((s) => s.resetSimulation);
  const resetCallView = useCallViewStore((s) => s.resetCallViewState);
  const clearIncomingCall = useIncomingCallStore((s) => s.clearIncomingCall);
  const resetTimer = useTimerStore((s) => s.reset);
  const resetBilling = useBillingStore((s) => s.resetSimulation);

  return () => {
    resetCall();
    resetOnlineUsers();
    resetCurrentUser();
    resetCallView();
    clearIncomingCall();
    resetTimer();
    resetBilling();
  };
};
