import { create } from 'zustand';
import { TimerState, initialTimerState } from './state.ts';
import { TimerActions, createTimerActions } from './actions.ts';

export const createTimerStore = () => create<TimerState & TimerActions>()((set) => ({
  ...initialTimerState,
  ...createTimerActions(set),
}));
