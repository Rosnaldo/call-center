import { keycloak } from '../api/keycloak';

class AuthSession {
    private static instance: AuthSession;

    token: string | undefined;
    email: string | undefined;

    private constructor() {
        this.token = undefined;
        this.email = undefined;
    }

    static getInstance(): AuthSession {
        if (!AuthSession.instance) {
            AuthSession.instance = new AuthSession();
        }
        return AuthSession.instance;
    }

    static override(overrides: Partial<AuthSession>): void {
        const instance = AuthSession.getInstance();
        Object.assign(instance, overrides);
    }

    static reset(): void {
        AuthSession.instance = new AuthSession();
    }

    get isAuthenticated(): boolean {
        return !!this.token;
    }

    async getToken(): Promise<string | undefined> {
        if (keycloak.authenticated) {
            try {
                await keycloak.updateToken(30);
                this.token = keycloak.token;
            } catch {
                keycloak.login();
            }
        }
        return this.token;
    }
}

export default AuthSession.getInstance();
export { AuthSession };
