import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloak } from '../api/keycloak';
import { apiBack } from '../api/backend';
import { ApiError } from '../error/api';
import { useCurrentUserStore } from '../states/current-user/store';
import { User } from '../entities/user';
import { OnlineUserState } from '../states/online-users/state';

type AuthContextType = {
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <AuthProviderReal>{children}</AuthProviderReal>;
}

async function fetchUser(email: string) {
    const res = await apiBack.get(
        "/users/by-email", {
            params: { email }
        }
    )
    
    if (res.data.isError) {
        throw new ApiError(res.data.message);
    }

    const user = res.data as User;
    return user;
}

function AuthProviderReal({ children }: { children: React.ReactNode }) {
    const initialized = useRef(false);
    const [ready, setReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
    const navigate = useNavigate();

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
            // const fullname = parsed?.name;

            const user = await fetchUser(email);
            const onlineUser: OnlineUserState = {
                ...user,
                id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                status: 'idle',
                isOnline: true,
            };
            setCurrentUser(onlineUser);
            setIsAuthenticated(auth);
            setReady(true);
        })
        .catch((error) => {
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            navigate(`/error?message=${encodeURIComponent(message)}`);
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
