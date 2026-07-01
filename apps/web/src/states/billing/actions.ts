import { BillingStore } from './state.ts';

export interface BillingActions {
  setInitialTokens: (tokens: number) => void;
  addOneToken: () => void;
}

export const createBillingActions = (
  set: (fn: (state: BillingStore) => Partial<BillingStore>) => void,
): BillingActions => ({
  setInitialTokens: (tokens) => set(() => ({ initialTokens: tokens })),
  addOneToken: () => set((state) => ({ initialTokens: state.initialTokens + 1 })),
});
