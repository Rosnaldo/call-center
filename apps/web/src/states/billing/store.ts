import { create } from 'zustand';
import { BillingStore, initialBillingStore } from './state.ts';
import { BillingActions, createBillingActions } from './actions.ts';

export type BillingStoreInstance = ReturnType<typeof createBillingStore>;

export const createBillingStore = () => create<BillingStore & BillingActions>()((set) => ({
  ...initialBillingStore,
  ...createBillingActions(set),
}));

export const useBillingStore = createBillingStore();
