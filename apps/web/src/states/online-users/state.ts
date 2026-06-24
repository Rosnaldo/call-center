/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IOnlineUser } from '@repo/shared-types';
import { MOCK_USERS } from './mock.ts';
import properties from '../../properties';

export interface OnlineUserState extends IOnlineUser {}

export interface OnlineUsersStore {
  users: OnlineUserState[];
}

export const initialOnlineUsersStore: OnlineUsersStore = {
  users: properties.isSimulation ? MOCK_USERS : [],
};
