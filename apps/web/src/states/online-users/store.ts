/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OnlineUsersStore, initialOnlineUsersStore } from './state.ts';
import { OnlineUsersActions, createOnlineUsersActions } from './actions.ts';

export const createOnlineUsersStore = () => create<OnlineUsersStore & OnlineUsersActions>()(
  persist(
    (set) => ({
      ...initialOnlineUsersStore,
      ...createOnlineUsersActions(set),
    }),
    {
      name: 'zustand_online_users_store',
      version: 1,
      partialize: (state) => ({
        users: state.users,
      }),
    }
  )
);
