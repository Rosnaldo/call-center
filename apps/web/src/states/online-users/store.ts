/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { OnlineUsersStore, initialOnlineUsersStore } from './state.ts';
import { OnlineUsersActions, createOnlineUsersActions } from './actions.ts';

export const createOnlineUsersStore = () => create<OnlineUsersStore & OnlineUsersActions>()(
  (set) => ({
    ...initialOnlineUsersStore,
    ...createOnlineUsersActions(set),
  })
);
