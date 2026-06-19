import { create } from 'zustand';
import { CallViewStateData, initialCallViewState } from './state.ts';
import { CallViewStateActions, createCallViewStateActions } from './actions.ts';

export const useCallViewStore = create<CallViewStateData & CallViewStateActions>((set) => ({
  ...initialCallViewState,
  ...createCallViewStateActions(set),
}));
