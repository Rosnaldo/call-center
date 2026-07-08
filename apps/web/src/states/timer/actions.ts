/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallState, getCallElapsedMs } from '@repo/shared-types';

export interface TimerActions {
  play: () => void;
  stop: () => void;
  reset: () => void;
  tick: () => void;
  syncFromCall: (call: CallState | null) => void;
}

export const createTimerActions = (
  set: (fn: (state: any) => any) => void
): TimerActions => {
  return {
    play: () => {
      set((state) => {
        if (state.status === 'playing') return {};
        return { status: 'playing' };
      });
    },

    stop: () => {
      set((state) => {
        if (state.status === 'stopped') return {};
        return { status: 'stopped' };
      });
    },

    reset: () => {
      set(() => ({ status: 'stopped', elapsedSeconds: 0 }));
    },

    tick: () => {
      set((state) => {
        if (state.status !== 'playing') return {};
        return { elapsedSeconds: state.elapsedSeconds + 1 };
      });
    },

    syncFromCall: (call: CallState | null) => {
      if (!call) {
        set(() => ({ status: 'stopped', elapsedSeconds: 0 }));
        return;
      }
      set(() => ({
        status: call.isPlaying ? 'playing' : 'stopped',
        elapsedSeconds: Math.floor(getCallElapsedMs(call) / 1000),
      }));
    },
  };
};
