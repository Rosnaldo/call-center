/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrentUserState, initialCurrentUserState } from './state.ts';
import { CurrentUserActions, createCurrentUserActions } from './actions.ts';

export const useCurrentUserStore = create<CurrentUserState & CurrentUserActions>()(
  persist(
    (set) => ({
      ...initialCurrentUserState,
      ...createCurrentUserActions(set),
    }),
    {
      name: 'zustand_current_user_store',
      version: 1,
      partialize: (state) => ({
        currentUser: state.currentUser,
      }),
    }
  )
);
