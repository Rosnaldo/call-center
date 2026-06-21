import { create } from 'zustand';
import { BillingStore, initialBillingStore } from './state.ts';
import { BillingActions, createBillingActions } from './actions.ts';

export const useBillingStore = create<BillingStore & BillingActions>()((set) => ({
  ...initialBillingStore,
  ...createBillingActions(set),
}));
