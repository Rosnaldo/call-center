/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useTimerStore } from '../states/stores.ts';
import { CallState } from '../states/call/state.ts';

/**
 * Manages the timer lifecycle (play/stop/reset) and syncs elapsedSeconds
 * from the wall clock every second to avoid drift.
 * Derived values (formattedTimer, billingCountdown) are read directly
 * from useTimerStore by the components that need them.
 */
export function useTimerOrchestrator(
  currentCall: CallState | undefined,
  isCallActive: boolean
): void {
  const callId = currentCall?.id;

  useEffect(() => {
    if (!callId || !isCallActive) {
      if (!isCallActive) useTimerStore.getState().stop();
      if (!callId) useTimerStore.getState().reset();
      return;
    }

    const start = Date.now();

    const syncToWallClock = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - start) / 1000));
      useTimerStore.setState({ elapsedSeconds: elapsed });
    };

    syncToWallClock();
    useTimerStore.getState().play();

    const interval = setInterval(syncToWallClock, 1000);
    return () => clearInterval(interval);
  }, [callId, isCallActive]);
}
