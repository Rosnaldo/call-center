import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { mapUserToOnlineUser } from '@repo/shared-types';
import { keycloakService, KeycloakState } from '../api/keycloak-service';
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
    const [kcState, setKcState] = useState<KeycloakState>(keycloakService.getState);
    const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

    useOnlineUsersWebSocket(kcState.token);

    useEffect(() => {
        const unsub = keycloakService.subscribe(setKcState);

        if (!initialized.current) {
            initialized.current = true;

            keycloakService.init().then(async () => {
                const { email } = keycloakService.getState();
                if (!email) throw new Error('Email não encontrado no token.');
                const user = await fetchUser(email);
                const onlineUser: OnlineUserState = mapUserToOnlineUser(user);
                await addOnlineUser(onlineUser);
                setCurrentUser(onlineUser);
                setReady(true);
            }).catch((error) => {
                const message = error instanceof Error ? error.message : 'Erro desconhecido.';
                setKcState((prev) => ({ ...prev, error: message }));
            });
        }

        return unsub;
    }, []);

    if (kcState.error) return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-brand-canvas)]">
            <div className="text-center bg-white p-8 rounded-2xl border border-slate-200/50 max-w-sm shadow-sm">
                <h3 className="text-base font-bold text-slate-800">Erro ao inicializar</h3>
                <p className="text-xs text-slate-500 mt-2">{kcState.error}</p>
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
                isAuthenticated: kcState.isAuthenticated,
                login: keycloakService.login,
                logout: keycloakService.logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useKeycloak = () => useContext(AuthContext) ?? { isAuthenticated: false, login: () => {}, logout: () => {} };
