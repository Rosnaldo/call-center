import { create } from 'zustand';
import { CurrentUserState, initialCurrentUserState } from './state.ts';
import { CurrentUserActions, createCurrentUserActions } from './actions.ts';

export const createCurrentUserStore = () => create<CurrentUserState & CurrentUserActions>()(
  (set) => ({
    ...initialCurrentUserState,
    ...createCurrentUserActions(set),
  })
);
