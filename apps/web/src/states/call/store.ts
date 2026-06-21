/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CallStore, initialCallStore } from './state.ts';
import { CallActions, createCallActions } from './actions.ts';

export const createCallStore = () => create<CallStore & CallActions>()(
  persist(
    (set) => ({
      ...initialCallStore,
      ...createCallActions(set),
    }),
    {
      name: 'zustand_call_store',
    }
  )
);
