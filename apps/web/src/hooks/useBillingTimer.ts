/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useOnlineUsersStore, useTimerStore, useCurrentUserStore, useBillingStore } from '../states/stores.ts';
import { CallState } from '../states/call/state.ts';
import { OnlineUserState } from '../states/online-users/state.ts';

const BILLING_INTERVAL_SECONDS = 10 * 60; // 600s = 10 minutes per token

export function useBillingTimer(call: CallState | undefined) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const currentUserRef = useRef<OnlineUserState | null>(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const callIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!call) {
      useTimerStore.getState().reset();
      callIdRef.current = undefined;
      return;
    }

    if (call.id !== callIdRef.current) {
      callIdRef.current = call.id;
      useTimerStore.getState().reset();
    }

    // startedAt/accumulatedMs come from the Daily.co webhook handlers, keeping
    // both the customer and attendant browsers synced off the same server clock
    // instead of each tab running its own independent stopwatch. The store is
    // already synced at the moment of each join/left by the call actions —
    // this just keeps it ticking every second while the call stays active.
    const sync = () => {
      useTimerStore.getState().syncFromCall(call);
      const elapsedSeconds = useTimerStore.getState().elapsedSeconds;

      const user = currentUserRef.current;
      if (!user) return;

      const isMyCall = user.id === call.customerId || user.id === call.attendantId;
      if (!isMyCall) return;

      const { initialTokens } = useBillingStore.getState();
      const tokensCount = initialTokens || 1;
      if (elapsedSeconds >= tokensCount * BILLING_INTERVAL_SECONDS) {
        const customerUser = useOnlineUsersStore.getState().users.find(u => u.id === call.customerId);
        const availableTokens = customerUser?.tokens ?? 5;

        if (tokensCount >= availableTokens) {
          // useCallStore.getState().billingOutOfTokens(call.id);
        } else {
          useBillingStore.getState().addOneToken();
        }
      }
    };

    sync();
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, [call?.id, call?.startedAt, call?.accumulatedMs]);
}
