import { OnlineUserState } from './state.ts';

export interface OnlineUsersActions {
  addTokens: (userId: string, tokens: number) => void;
  setUsers: (users: OnlineUserState[]) => void;
}

export const createOnlineUsersActions = (
  set: (fn: (state: any) => any) => void
): OnlineUsersActions => {
  return {
    // Optimistic local balance bump right after a successful token purchase
    // (see payments-page) — unrelated to the update_online_users SSE event,
    // there's no server push for a purchase made through /api/buy-tokens.
    addTokens: (userId, tokens) => {
      set((state: { users: OnlineUserState[] }) => ({
        users: state.users.map((u) => u.id === userId ? { ...u, tokens: (u.tokens ?? 0) + tokens } : u),
      }));
    },

    // The single source of truth for online-users state — fed by the
    // update_online_users event (see init-realtime-events.ts).
    setUsers: (users) => {
      set(() => ({
        users: users,
        isLoading: false,
        error: null,
      }));
    },
  };
};
