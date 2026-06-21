export interface BillingStore {
  initialTokens: number;
  resetSignal: number;
}

export const initialBillingStore: BillingStore = {
  initialTokens: 1,
  resetSignal: 0,
};
