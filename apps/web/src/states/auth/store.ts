import { create } from 'zustand';
import { AuthState, initialAuthState } from './state';
import { AuthActions, createAuthActions } from './actions';

export type AuthStoreInstance = ReturnType<typeof createAuthStore>;

export const createAuthStore = () => create<AuthState & AuthActions>()(
    (set, get) => ({
        ...initialAuthState,
        ...createAuthActions(set, get),
    }),
);

export const useAuthStore = createAuthStore();
