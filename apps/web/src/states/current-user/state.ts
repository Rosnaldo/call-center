import { IUser } from '@repo/shared-types';

export interface CurrentUserState {
  currentUser: IUser | null;
}

export const initialCurrentUserState: CurrentUserState = {
  currentUser: null,
};
