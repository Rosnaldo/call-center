/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_USERS } from './mock.ts';
import { OnlineUserState } from './state.ts';

export interface OnlineUsersActions {
  upsertUser: (user: OnlineUserState) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<OnlineUserState>) => void;
  addTokensSimulation: (userId: string, tokens: number) => void;
  setUsers: (users: OnlineUserState[]) => void;
  resetSimulation: () => void;
}

export const createOnlineUsersActions = (
  set: (fn: (state: any) => any) => void
): OnlineUsersActions => {
  return {
    upsertUser: (user) => {
      set((state) => {
        const exists = state.users.some((u: OnlineUserState) => u.id === user.id);
        return {
          users: exists
            ? state.users.map((u: OnlineUserState) => (u.id === user.id ? { ...u, ...user } : u))
            : [...state.users, user],
        };
      });
    },

    removeUser: (userId) => {
      set((state) => ({
        users: state.users.filter((u: OnlineUserState) => u.id !== userId),
      }));
    },

    updateUser: (userId, updates) => {
      set((state) => ({
        users: state.users.map((u: OnlineUserState) => {
          if (u.id === userId) {
            return { ...u, ...updates };
          }
          return u;
        }),
      }));
    },

    addTokensSimulation: (userId, tokens) => {
      set((state) => ({
        users: state.users.map((u: OnlineUserState) => {
          if (u.id === userId) {
            return { ...u, tokens: (u.tokens ?? 0) + tokens };
          }
          return u;
        }),
      }));
    },

    setUsers: (users) => {
      set(() => ({
        users: users,
        isLoading: false,
        error: null,
      }));
    },

    resetSimulation: () => {
      set(() => ({
        users: MOCK_USERS,
      }));
    },
  };
};
