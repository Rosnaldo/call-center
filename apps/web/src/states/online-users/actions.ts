import { OnlineUserState } from './state.ts';

export interface OnlineUsersActions {
  setUsers: (users: OnlineUserState[]) => void;
}

export const createOnlineUsersActions = (
  set: (fn: (state: any) => any) => void
): OnlineUsersActions => {
  return {
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
