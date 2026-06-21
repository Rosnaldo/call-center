/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { useCallStore } from '../states/call/store.ts';
import { useOnlineUsersStore } from '../states/online-users/store.ts';
import { useTimerStore } from '../states/timer/store.ts';
import { useCurrentUserStore } from '../states/current-user/store.ts';
import { CallState } from '../states/call/state.ts';
import { OnlineUserState } from '../states/online-users/state.ts';
import { useBillingStore } from '../states/billing/store.ts';

const BILLING_INTERVAL_SECONDS = 10 * 60; // 600s = 10 minutes per token

export function useBillingTimer(call: CallState | undefined) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const currentUserRef = useRef<OnlineUserState | null>(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Accumulated active seconds from previous segments (before interruptions)
  const accumulatedRef = useRef(0);
  // Timestamp when the current active segment started
  const segmentStartRef = useRef<number | null>(null);
  const callIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!call) {
      useTimerStore.getState().reset();
      accumulatedRef.current = 0;
      segmentStartRef.current = null;
      callIdRef.current = undefined;
      return;
    }

    if (call.id !== callIdRef.current) {
      accumulatedRef.current = 0;
      segmentStartRef.current = null;
      callIdRef.current = call.id;
      useTimerStore.getState().reset();
    }

    if (call.status === 'active') {
      if (segmentStartRef.current === null) {
        segmentStartRef.current = Date.now();
        useTimerStore.getState().play();
      }

      const interval = setInterval(() => {
        if (segmentStartRef.current === null) return;

        const elapsed = accumulatedRef.current + Math.floor((Date.now() - segmentStartRef.current) / 1000);
        useTimerStore.setState({ elapsedSeconds: elapsed });

        const user = currentUserRef.current;
        if (!user) return;

        const snapshot = useCallStore.getState().call;
        if (!snapshot || snapshot.status !== 'active') return;

        const isMyCall = user.id === snapshot.customerId || user.id === snapshot.attendantId;
        if (!isMyCall) return;

        const { initialTokens } = useBillingStore.getState();
        const tokensCount = initialTokens || 1;
        if (elapsed >= tokensCount * BILLING_INTERVAL_SECONDS) {
          const customerUser = useOnlineUsersStore.getState().users.find(u => u.id === snapshot.customerId);
          const availableTokens = customerUser?.tokens ?? 5;

          if (tokensCount >= availableTokens) {
            // useCallStore.getState().billingOutOfTokens(snapshot.id);
          } else {
            useBillingStore.getState().addOneToken();
          }
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        // Freeze elapsed time before this segment ends
        if (segmentStartRef.current !== null) {
          accumulatedRef.current += Math.floor((Date.now() - segmentStartRef.current) / 1000);
          segmentStartRef.current = null;
        }
      };
    }

    // Interrupted or awaiting — freeze timer without losing accumulated time
    useTimerStore.getState().stop();
    if (segmentStartRef.current !== null) {
      accumulatedRef.current += Math.floor((Date.now() - segmentStartRef.current) / 1000);
      segmentStartRef.current = null;
    }
  }, [call?.id, call?.status]);
}
