/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { useCallStore } from '../../states/call/store.ts';
import { CustomerPageUI } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

interface CustomerPageContainerProps {
  navigate: (path: string) => void;
  handleLogout: () => void;
  completeCall: (attendantId: string, callId?: string, byAttendant?: boolean) => void;
  updateCall: (callId: string, updates: any) => void;
}

export const CustomerPageContainer: React.FC<CustomerPageContainerProps> = ({
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

  return (
    <CustomerPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      navigate={navigate}
      handleLogout={handleLogout}
      completeCall={completeCall}
      addTokensSimulation={addTokensSimulation}
      updateCall={updateCall}
    />
  );
};
