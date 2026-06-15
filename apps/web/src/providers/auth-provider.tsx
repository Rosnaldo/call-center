import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { mapUserToOnlineUser } from '@repo/shared-types';
import { keycloak } from '../api/keycloak';
import { useCurrentUserStore } from '../states/current-user/store';
import { OnlineUserState } from '../states/online-users/state';
import { fetchUser } from '../services/user';
import { addOnlineUser } from '../services/online-users';
import { useOnlineUsersWebSocket } from '../hooks/useOnlineUsersWebSocket';

type AuthContextType = {
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <AuthProviderReal>{children}</AuthProviderReal>;
}

function AuthProviderReal({ children }: { children: React.ReactNode }) {
    const initialized = useRef(false);
    const [ready, setReady] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [kcToken, setKcToken] = useState<string | undefined>(undefined);
    const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

    useOnlineUsersWebSocket(kcToken);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        keycloak
        .init({
            redirectUri: window.location.origin + '/',
            onLoad: 'login-required',
            checkLoginIframe: false,
            enableLogging: true,
        })
        .then(async (auth) => {
            const parsed = keycloak.tokenParsed;
            const email = parsed?.email;

            const user = await fetchUser(email);
            const onlineUser: OnlineUserState = mapUserToOnlineUser(user);

            await addOnlineUser(onlineUser);

            setCurrentUser(onlineUser);
            setKcToken(keycloak.token);
            setIsAuthenticated(auth);
            setReady(true);
        })
        .catch((error) => {
            console.error('Keycloak initialization failed:', error);
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            setInitError(message);
        });

        keycloak.onAuthSuccess = () => setIsAuthenticated(true);
        keycloak.onAuthLogout = () => setIsAuthenticated(false);

        keycloak.onTokenExpired = () => {
            keycloak.updateToken(30).catch(() => {
                setIsAuthenticated(false);
                keycloak.logout({
                    redirectUri: window.location.origin,
                });
            });
        };
    }, []);

    if (initError) return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-brand-canvas)]">
            <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
                <h3 className="text-base font-bold text-slate-800">Erro ao inicializar</h3>
                <p className="text-xs text-slate-500 mt-2">{initError}</p>
                <button
                    onClick={() => window.location.replace('/login')}
                    className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm cursor-pointer"
                >
                    Tentar novamente
                </button>
            </div>
        </div>
    );

    if (!ready) return <div>Loading session…</div>;

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                login: () =>
                    keycloak.login({
                        prompt: 'login',
                        redirectUri: window.location.href,
                    }),
                logout: () =>
                    keycloak.logout({
                        redirectUri: window.location.origin,
                    }),
            }}
        >
        {children}
        </AuthContext.Provider>
    );
}

export const useKeycloak = () => useContext(AuthContext) ?? { isAuthenticated: false, login: () => {}, logout: () => {} };
