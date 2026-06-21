import { create } from 'zustand';
import { IncomingCallStore, initialIncomingCallStore } from './state.ts';
import { IncomingCallActions, createIncomingCallActions } from './actions.ts';

export const useIncomingCallStore = create<IncomingCallStore & IncomingCallActions>()((set, get) => ({
  ...initialIncomingCallStore,
  ...createIncomingCallActions(set, get),
}));
