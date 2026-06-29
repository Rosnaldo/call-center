class Properties {
    private static instance: Properties;

    nodeEnv: string;
    port: string | number;
    isRuntime: string;
    keycloakUri: string;
    keycloakClientId: string;
    keycloakClientSecret: string;
    iamUri: string;
    corsOrigins: string[];
    dailyApiKey: string;
    webhookUrl: string;

    private constructor() {
        this.nodeEnv = process.env.NODE_ENV || '';
        this.port = process.env.PORT || 5003;
        this.isRuntime = process.env.RUNTIME || '';
        this.keycloakUri = process.env.KEYCLOAK_URI || '';
        this.keycloakClientId = process.env.KEYCLOAK_CLIENT_ID || '';
        this.keycloakClientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
        this.iamUri = process.env.IAM_URI || '';
        this.corsOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
        this.dailyApiKey = process.env.DAILY_API_KEY || '';
        this.webhookUrl = process.env.WEBHOOK_URL || '';
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
