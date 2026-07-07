/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useCallStore, useCurrentUserStore } from '../../states/stores.ts';
import { AttendantPageUI } from './ui.tsx';
import { useBillingTimer } from '@/src/hooks/useBillingTimer.ts';

export const AttendantPageContainer: React.FC = () => {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const call = useCallStore((state) => state.call);
  const completeCall = useCallStore((s) => s.completeCall);

  useBillingTimer(call ?? undefined);

  return (
    <AttendantPageUI
      currentUser={currentUser || null}
      call={call}
      completeCall={completeCall}
    />
  );
};
