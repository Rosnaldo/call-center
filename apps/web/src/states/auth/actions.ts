import { mapUserToOnlineUser } from '@repo/shared-types';
import { keycloak } from '../../api/keycloak';
import { fetchUser } from '../../services/user';
import { addOnlineUser } from '../../services/online-users';
import { useCurrentUserStore } from '../stores';
import { AuthState } from './state';

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
            if (!email) throw new Error('Email não encontrado no token.');
            const user = await fetchUser(email);
            const onlineUser = mapUserToOnlineUser(user);
            await addOnlineUser(onlineUser);
            useCurrentUserStore.getState().setCurrentUser(onlineUser);
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

            set(() => ({
                isAuthenticated: auth,
                token: keycloak.token,
                email: keycloak.tokenParsed?.email,
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
