import { CallState } from '../call/state.ts';

export interface BillingStore {
  initialTokens: number;
  isCalculationModalOpen: boolean;
  completedCallSummary: CallState | null;
}

export const initialBillingStore: BillingStore = {
  initialTokens: 1,
  isCalculationModalOpen: false,
  completedCallSummary: null,
};
