/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnlineUsersStore } from '../../states/online-users/store.ts';
import { useCallStore } from '../../states/call/store.ts';
import { CustomerPageUI } from './ui.tsx';
import { useCurrentUserStore } from '@/src/states/current-user/store.ts';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

export const CustomerPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const addTokensSimulation = useOnlineUsersStore((state) => state.addTokensSimulation);
  const call = useCallStore((state) => state.call);
  const completeCall = useCallStore((s) => s.completeCall);
  const updateCall = useCallStore((s) => s.updateCall);

  useBillingTimer(call ?? undefined);

  return (
    <CustomerPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      navigate={navigate}
      completeCall={completeCall}
      addTokensSimulation={addTokensSimulation}
      updateCall={updateCall}
    />
  );
};
