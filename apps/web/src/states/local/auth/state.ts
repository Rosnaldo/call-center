export interface AuthState {
    ready: boolean;
    error: string | null;
    isAuthenticated: boolean;
    token: string | undefined;
    email: string | undefined;
}

export const initialAuthState: AuthState = {
    ready: false,
    error: null,
    isAuthenticated: false,
    token: undefined,
    email: undefined,
};
