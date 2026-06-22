/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { CallStore, initialCallStore } from './state.ts';
import { CallActions, createCallActions } from './actions.ts';

export const createCallStore = () => create<CallStore & CallActions>()(
  (set) => ({
    ...initialCallStore,
    ...createCallActions(set),
  })
);
