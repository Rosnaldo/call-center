import { CallState } from '../../shared/call/state.ts';
import { BillingStore } from './state.ts';

export interface BillingActions {
  setInitialTokens: (tokens: number) => void;
  addOneToken: () => void;
  openCalculationModal: () => void;
  closeCalculationModal: () => void;
  openSummaryModal: (call: CallState) => void;
  closeSummaryModal: () => void;
}

export const createBillingActions = (
  set: (fn: (state: BillingStore) => Partial<BillingStore>) => void,
): BillingActions => ({
  setInitialTokens: (tokens) => set(() => ({ initialTokens: tokens })),
  addOneToken: () => set((state) => ({ initialTokens: state.initialTokens + 1 })),
  openCalculationModal: () => set(() => ({ isCalculationModalOpen: true })),
  closeCalculationModal: () => set(() => ({ isCalculationModalOpen: false })),
  openSummaryModal: (call) => set(() => ({ completedCallSummary: call, isCalculationModalOpen: false })),
  closeSummaryModal: () => set(() => ({ completedCallSummary: null })),
});
