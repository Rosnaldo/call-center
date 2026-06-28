class Properties {
    private static instance: Properties;

    backendUrl: string;
    realtimeWsUrl: string;
    keycloakUrl: string;
    keycloakRealm: string;
    keycloakClientId: string;
    dailyDomain: string;
    dailyApiKey: string;
    isSimulation: boolean;
    isProduction: boolean;
    lang: string;

    private constructor() {
        const env = (import.meta as any).env ?? {};
        this.backendUrl = env.VITE_BACKEND_URL ?? '';
        this.realtimeWsUrl = env.VITE_REALTIME_WS_URL ?? '';
        this.keycloakUrl = env.VITE_KEYCLOAK_URL ?? '';
        this.keycloakRealm = env.VITE_KEYCLOAK_REALM ?? '';
        this.keycloakClientId = env.VITE_KEYCLOAK_CLIENT_ID ?? '';
        this.dailyDomain = env.VITE_DAILY_DOMAIN ?? 'meetcent';
        this.dailyApiKey = env.VITE_DAILY_API_KEY ?? '';
        this.isSimulation = env.VITE_ENV === 'simulation';
        this.isProduction = env.VITE_ENV === 'production';
        this.lang = env.VITE_LANG ?? 'en';
    }

    static getInstance(): Properties {
        if (!Properties.instance) {
            Properties.instance = new Properties();
        }
        return Properties.instance;
    }

    static override(overrides: Partial<Properties>): void {
        const instance = Properties.getInstance();
        Object.assign(instance, overrides);
    }

    static reset(): void {
        Properties.instance = new Properties();
    }
}

export default Properties.getInstance();
export { Properties };
