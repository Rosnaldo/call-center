/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore, useCallStore, useIncomingCallStore, useCurrentUserStore } from '../../states/stores.ts';
import { CustomerPageUI } from './ui.tsx';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

export const CustomerPageContainer: React.FC = () => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);
  const call = useCallStore((state) => state.call);
  const completeCall = useCallStore((s) => s.completeCall);

  const simulateIncomingCallAsCustomer = useIncomingCallStore((s) => s.simulateIncomingCallAsCustomer);

  useBillingTimer(call ?? undefined);

  return (
    <CustomerPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      completeCall={completeCall}
      addTokensSimulation={addTokensSimulation}
      simulateIncomingCallAsCustomer={simulateIncomingCallAsCustomer}
    />
  );
};
