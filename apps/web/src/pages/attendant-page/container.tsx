/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore, useCallStore, useIncomingCallStore, useCurrentUserStore } from '../../states/stores.ts';
import { AttendantPageUI } from './ui.tsx';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

export const AttendantPageContainer: React.FC = () => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);
  const call = useCallStore((state) => state.call);
  const completeCall = useCallStore((s) => s.completeCall);

  const simulateIncomingCall = useIncomingCallStore((s) => s.simulateIncomingCall);

  useBillingTimer(call ?? undefined);

  return (
    <AttendantPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      completeCall={completeCall}
      addTokensSimulation={addTokensSimulation}
      simulateIncomingCall={simulateIncomingCall}
    />
  );
};
