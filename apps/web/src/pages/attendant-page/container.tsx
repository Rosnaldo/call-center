/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineUsersStore, useCallStore, useCurrentUserStore } from '../../states/stores.ts';
import { AttendantPageUI } from './ui.tsx';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

export const AttendantPageContainer: React.FC = () => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((state) => state.users);
  const call = useCallStore((state) => state.call);
  const completeCall = useCallStore((s) => s.completeCall);

  useBillingTimer(call ?? undefined);

  return (
    <AttendantPageUI
      currentUser={currentUser || null}
      users={users}
      call={call}
      completeCall={completeCall}
    />
  );
};
