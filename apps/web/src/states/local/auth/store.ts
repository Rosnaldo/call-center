import { create } from 'zustand';
import { AuthState, initialAuthState } from './state';
import { AuthActions, createAuthActions } from './actions';

export const createAuthStore = () => create<AuthState & AuthActions>()(
    (set, get) => ({
        ...initialAuthState,
        ...createAuthActions(set, get),
    }),
);
