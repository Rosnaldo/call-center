import { create } from 'zustand';
import { IncomingCallStore, initialIncomingCallStore } from './state.ts';
import { IncomingCallActions, createIncomingCallActions } from './actions.ts';

export type IncomingCallStoreInstance = ReturnType<typeof createIncomingCallStore>;

export const createIncomingCallStore = () => create<IncomingCallStore & IncomingCallActions>()((set, get) => ({
  ...initialIncomingCallStore,
  ...createIncomingCallActions(set, get),
}));

export const useIncomingCallStore = createIncomingCallStore();
