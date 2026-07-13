import { keycloak } from '../../api/keycloak';
import { fetchUser } from '../../services/api/user';
import { useCurrentUserStore } from '../stores';
import { AuthState } from './state';
import authSession from '../../auth/session';

export interface AuthActions {
    reset(): void;
    bootstrap(): Promise<void>;
    init(): Promise<void>;
    login(): void;
    logout(): void;
}

export const createAuthActions = (
    set: (fn: (state: any) => any) => void,
    get: () => AuthState & AuthActions,
): AuthActions => ({
    reset() {
        useCurrentUserStore.getState().setCurrentUser(null);

        set(() => ({
            isAuthenticated: false,
            token: undefined,
            email: undefined,
        }));

        keycloak.logout({ redirectUri: window.location.origin });
    },

    async bootstrap() {
        await get().init();

        const { error, email } = get();
        if (error) return;

        try {
            if (!email) throw new Error('Email not found in token.');
            const user = await fetchUser(email);
            // No more direct IAM registration here — realtime's onConnection
            // handler (see websocket/connection.ts) adds this user to the
            // shared online_user presence record moments later, when its
            // WebSocket connects right after this.
            useCurrentUserStore.getState().setCurrentUser(user);
            set(() => ({ ready: true }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido.';
            this.reset();
            set(() => ({ error: message }));
        }
    },

    async init() {
        try {
            const auth = await keycloak.init({
                redirectUri: window.location.origin + '/',
                onLoad: 'login-required',
                checkLoginIframe: false,
                enableLogging: true,
            });

            keycloak.onAuthSuccess = () => set(() => ({ isAuthenticated: true }));
            keycloak.onAuthLogout = () => {this.reset()};
            keycloak.onTokenExpired = () => {
                keycloak.updateToken(30).catch(() => {
                    set(() => ({ isAuthenticated: false }));
                    keycloak.logout({ redirectUri: window.location.origin });
                });
            };

            authSession.token = keycloak.token;
            authSession.email = keycloak.tokenParsed?.email;

            set(() => ({
                isAuthenticated: auth,
                token: authSession.token,
                email: authSession.email,
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            set(() => ({ error: message }));
        }
    },

    login() {
        keycloak.login({ prompt: 'login', redirectUri: window.location.href });
    },

    logout() {
        keycloak.logout({ redirectUri: window.location.origin });
    },
});
