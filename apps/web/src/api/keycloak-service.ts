import { keycloak } from './keycloak';

export type KeycloakState = {
    ready: boolean;
    error: string | null;
    isAuthenticated: boolean;
    token: string | undefined;
    email: string | undefined;
};

type Listener = (state: KeycloakState) => void;

const listeners = new Set<Listener>();

let state: KeycloakState = {
    ready: false,
    error: null,
    isAuthenticated: false,
    token: undefined,
    email: undefined,
};

const set = (patch: Partial<KeycloakState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l(state));
};

export const keycloakService = {
    getState(): KeycloakState {
        return state;
    },

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    async init(): Promise<void> {
        try {
            const auth = await keycloak.init({
                redirectUri: window.location.origin + '/',
                onLoad: 'login-required',
                checkLoginIframe: false,
                enableLogging: true,
            });

            keycloak.onAuthSuccess = () => set({ isAuthenticated: true });
            keycloak.onAuthLogout = () => set({ isAuthenticated: false });
            keycloak.onTokenExpired = () => {
                keycloak.updateToken(30).catch(() => {
                    set({ isAuthenticated: false });
                    keycloak.logout({ redirectUri: window.location.origin });
                });
            };

            set({
                isAuthenticated: auth,
                token: keycloak.token,
                email: keycloak.tokenParsed?.email,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            set({ error: message });
        }
    },

    login(): void {
        keycloak.login({ prompt: 'login', redirectUri: window.location.href });
    },

    logout(): void {
        keycloak.logout({ redirectUri: window.location.origin });
    },
};
