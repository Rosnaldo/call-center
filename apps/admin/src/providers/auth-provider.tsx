import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { keycloak } from '../api/keycloak';

type User = { email: string; fullname: string };

type AuthContextType = {
    loggedUser: User;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType>  (null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const initialized = useRef(false); // 🔐 proteção
    const [ready, setReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loggedUser, setLoggedUser] = useState<User>({ email: '', fullname: '' });

    useEffect(() => {
        if (initialized.current) return; // ⛔ evita múltiplos init
        initialized.current = true;

        // Clear any old cached tokens and session storage
        // keycloak.clearToken?.(); // clear token if previously set
        // sessionStorage.clear();   // clear session storage
        // localStorage.clear();     // clear local storage if used

        keycloak
        .init({
            onLoad: 'login-required',
            checkLoginIframe: false,
            enableLogging: true,
        })
        .then((authenticated) => {
            const parsed = keycloak.tokenParsed;
            const email = parsed?.email;
            const fullname = parsed?.name;

            setIsAuthenticated(authenticated);
            setReady(true);
            setLoggedUser({ email, fullname });
        })
        .catch(console.error);

        keycloak.onAuthSuccess = () => setIsAuthenticated(true);
        keycloak.onAuthLogout = () => setIsAuthenticated(false);

        keycloak.onTokenExpired = () => {
            keycloak.updateToken(30).catch(() => {
                setIsAuthenticated(false);
                keycloak.logout({
                    redirectUri: window.location.origin + import.meta.env.VITE_BASE_PATH,
                });
            });
        };
    }, []);

    if (!ready) return <div>Loading session…</div>;

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                loggedUser,
                login: () =>
                    keycloak.login({
                        prompt: 'login',
                        redirectUri: window.location.origin + import.meta.env.VITE_BASE_PATH + '/users',
                    }),
                logout: () =>
                    keycloak.logout({
                        redirectUri: window.location.origin + import.meta.env.VITE_BASE_PATH,
                    }),
            }}
        >
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
