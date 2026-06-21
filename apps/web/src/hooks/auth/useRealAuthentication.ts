import { useAuthStore } from '../../states/stores';

export function useRealAuthentication() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const login = useAuthStore((s) => s.login);
    const logout = useAuthStore((s) => s.logout);
    return { isAuthenticated, login, logout };
}
