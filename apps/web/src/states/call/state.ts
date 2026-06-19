/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CallState } from '@repo/shared-types';

export type { CallState };

export interface CallStore {
  call: CallState | null;
  resetSignal: number;
}

export const initialCallStore: CallStore = {
  call: null,
  resetSignal: 0,
};
