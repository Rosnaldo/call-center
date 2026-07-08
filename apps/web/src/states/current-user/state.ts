import { OnlineUserState } from "../online-users/state";


export interface CurrentUserState {
  currentUser: OnlineUserState | null;
}

export const initialCurrentUserState: CurrentUserState = {
  currentUser: null,
};
