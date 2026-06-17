/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ICall } from '@repo/shared-types';

export interface CallState extends ICall {
  status: 'active' | 'completed' | 'awaiting-answer' | 'call-interrupteded';
  wasAnswered: boolean;
  startedAt?: number;
  tokensCharged?: number; // Number of tokens charged during this session
  interruptedAt?: number; // Timestamp when connection was interrupted, used to adjust startedAt on reconnect
}

export interface CallStore {
  call: CallState | null,
}

export const initialCallStore: CallStore = {
  call: null,
};
