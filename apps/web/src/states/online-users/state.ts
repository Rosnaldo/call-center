/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User as EntityUser } from '../../entities/user';
import { MOCK_USERS } from './mock.ts';

export interface OnlineUserState extends EntityUser {
  status: 'idle' | 'waiting' | 'in-call';
  isOnline?: boolean;
}

export interface OnlineUsersStore {
  users: OnlineUserState[];
}

const isSimulation = (import.meta as any).env?.VITE_ENV !== 'production';

export const initialOnlineUsersStore: OnlineUsersStore = {
  users: isSimulation ? MOCK_USERS : [],
};
