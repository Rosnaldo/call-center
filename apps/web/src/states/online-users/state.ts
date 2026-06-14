/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IOnlineUser } from '@repo/shared-types';
import { MOCK_USERS } from './mock.ts';

export interface OnlineUserState extends IOnlineUser {}

export interface OnlineUsersStore {
  users: OnlineUserState[];
}

const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

export const initialOnlineUsersStore: OnlineUsersStore = {
  users: isSimulation ? MOCK_USERS : [],
};
