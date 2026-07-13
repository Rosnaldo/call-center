import { CallState } from '../../shared/call/state.ts';

export interface BillingStore {
  initialTokens: number;
  isCalculationModalOpen: boolean;
  completedCallSummary: CallState | null;
}

export const initialBillingStore: BillingStore = {
  initialTokens: 0,
  isCalculationModalOpen: false,
  completedCallSummary: null,
};
