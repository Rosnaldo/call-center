/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimerStatus = 'playing' | 'stopped';

export interface TimerState {
  status: TimerStatus;
  elapsedSeconds: number;
}

export const initialTimerState: TimerState = {
  status: 'stopped',
  elapsedSeconds: 0,
};
