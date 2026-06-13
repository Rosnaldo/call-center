/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_USERS } from "../online-users/mock";
import { OnlineUserState } from "../online-users/state";

export interface CurrentUserActions {
  setCurrentUser: (user: OnlineUserState | null) => void;
  resetSimulation: () => void;
}

export const createCurrentUserActions = (
  set: (fn: (state: any) => any) => void
): CurrentUserActions => {
  return {
    setCurrentUser: (user) => {
      set(() => ({
        currentUser: user,
      }));
    },

    resetSimulation: () => {
      set((state) => {
        const { currentUser } = state;
        if (currentUser) {
          const user = MOCK_USERS.find(u => u.id === currentUser.id);
          return (user) ? 
            {
              ...currentUser,
              name: user.name,
              avatarUrl: user.avatarUrl,
              email: user.email,
              status: 'idle' as const
            } : null;
        }
      });
    },
  };
};
