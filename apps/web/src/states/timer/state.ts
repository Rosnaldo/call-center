export type TimerStatus = 'playing' | 'stopped';

export interface TimerState {
  status: TimerStatus;
  elapsedSeconds: number;
}

export const initialTimerState: TimerState = {
  status: 'stopped',
  elapsedSeconds: 0,
};
