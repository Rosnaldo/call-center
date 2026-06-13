/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimerActions {
  play: () => void;
  stop: () => void;
  reset: () => void;
  tick: () => void;
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
  };
};
