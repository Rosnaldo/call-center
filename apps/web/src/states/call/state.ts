import { CallState } from '@repo/shared-types';

export type { CallState };

export interface CallStore {
  call: CallState | null;
}

export const initialCallStore: CallStore = {
  call: null,
};
