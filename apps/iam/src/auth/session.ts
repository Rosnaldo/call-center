class AuthSession {
    private static instance: AuthSession;

    token: string | undefined;

    private constructor() {
        this.token = undefined;
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
}

export default AuthSession.getInstance();
export { AuthSession };
