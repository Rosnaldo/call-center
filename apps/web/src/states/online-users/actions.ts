import { OnlineUserState } from './state.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';

export interface OnlineUsersActions {
  updateUser: (userId: string, updates: Partial<OnlineUserState>) => void;
  addTokens: (userId: string, tokens: number) => void;
  setUsers: (users: OnlineUserState[]) => void;
  refreshUsers: () => void;
}

export const createOnlineUsersActions = (
  set: (fn: (state: any) => any) => void
): OnlineUsersActions => {
  return {
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

    addTokens: (userId, tokens) => {
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

    refreshUsers: async () => {
      try {
        const users = await fetchOnlineUsers();
        set(() => ({ users }));
      } catch {}
    },
  };
};
