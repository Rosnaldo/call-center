/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IOnlineUser } from '@repo/shared-types';

export interface OnlineUserState extends IOnlineUser {}

export interface OnlineUsersStore {
  users: OnlineUserState[];
}

export const initialOnlineUsersStore: OnlineUsersStore = {
  users: [],
};
