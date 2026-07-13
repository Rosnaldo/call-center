import { IOnlineUser } from '@repo/shared-types';

export interface OnlineUserState extends IOnlineUser {}

export interface OnlineUsersStore {
  users: OnlineUserState[];
}

export const initialOnlineUsersStore: OnlineUsersStore = {
  users: [],
};
