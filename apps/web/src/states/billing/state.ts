import { CallState } from '../call/state.ts';

export interface BillingStore {
  initialTokens: number;
  isCalculationModalOpen: boolean;
  completedCallSummary: CallState | null;
}

// initialTokens counts tokens already charged for the running call (0-based
// — matches CallState.tokensToBeCharged, which the backend also charges from
// zero). Keep this consistent everywhere: useBillingTimer increments it,
// InfoCard derives the countdown from it — a 1-based "next token" reading
// anywhere in that chain produces a negative countdown for the first 2.5min
// of every call and a duplicate charge in the live counter right after.
export const initialBillingStore: BillingStore = {
  initialTokens: 0,
  isCalculationModalOpen: false,
  completedCallSummary: null,
};
