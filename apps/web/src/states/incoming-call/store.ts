import { create } from 'zustand';
import type { StoresRef } from '../stores.ts';
import { IncomingCallStore, initialIncomingCallStore } from './state.ts';
import { IncomingCallActions, createIncomingCallActions } from './actions.ts';

export const createIncomingCallStore = (ref: StoresRef) => create<IncomingCallStore & IncomingCallActions>()((set, get) => ({
  ...initialIncomingCallStore,
  ...createIncomingCallActions(set, get, ref),
}));
