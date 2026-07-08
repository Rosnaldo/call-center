import { OnlineUserState } from "../online-users/state";

export interface CurrentUserActions {
  setCurrentUser: (user: OnlineUserState | null) => void;
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
  };
};
