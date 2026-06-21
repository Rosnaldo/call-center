import { create } from 'zustand';
import { CallViewStateData, initialCallViewState } from './state.ts';
import { CallViewStateActions, createCallViewStateActions } from './actions.ts';

export type CallViewStoreInstance = ReturnType<typeof createCallViewStore>;

export const createCallViewStore = () => create<CallViewStateData & CallViewStateActions>((set) => ({
  ...initialCallViewState,
  ...createCallViewStateActions(set),
}));

export const useCallViewStore = createCallViewStore();
