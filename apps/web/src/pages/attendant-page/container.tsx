/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { useCallStore } from '../../states/call/store.ts';
import { AttendantPageUI } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

interface AttendantPageContainerProps {
  navigate: (path: string) => void;
  handleLogout: () => void;
  completeCall: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
  updateCall: (callId: string, updates: any) => void;
}

export const AttendantPageContainer: React.FC<AttendantPageContainerProps> = ({
  navigate,
  handleLogout,
  completeCall,
  updateCall,
}) => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);
  const call = useCallStore((state) => state.call);

  useBillingTimer(call ?? undefined);

  const simulateIncomingCall = useCallStore((s) => s.simulateIncomingCall);

  return (
    <AttendantPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      navigate={navigate}
      handleLogout={handleLogout}
      completeCall={completeCall}
      addTokensSimulation={addTokensSimulation}
      updateCall={updateCall}
      simulateIncomingCall={simulateIncomingCall}
    />
  );
};
