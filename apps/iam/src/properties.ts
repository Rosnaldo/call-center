class Properties {
    private static instance: Properties;

    nodeEnv: string;
    port: string | number;
    mongoUri: string;
    redisUri: string;
    awsRegion: string | undefined;
    awsAccessKeyId: string | undefined;
    awsSecretAccessKey: string | undefined;
    awsS3Bucket: string | undefined;
    keycloakUri: string;
    keycloakClientApiId: string;
    keycloakClientApiSecret: string;
    isRuntime: string;
    s3Host: string;
    cdnHost: string;
    realtimeUri: string;
    corsOrigins: string[];
    dailyApiKey: string;

    private constructor() {
        this.nodeEnv = process.env.NODE_ENV || '';
        this.port = process.env.PORT || 5002;
        this.mongoUri = process.env.MONGO_URI || '';
        this.redisUri = process.env.REDIS_URI || '';
        this.awsRegion = process.env.AWS_REGION;
        this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
        this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        this.awsS3Bucket = process.env.AWS_S3_BUCKET;
        this.keycloakUri = process.env.KEYCLOAK_URI || '';
        this.keycloakClientApiId = process.env.KEYCLOAK_CLIENT_ID || '';
        this.keycloakClientApiSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
        this.isRuntime = process.env.RUNTIME || '';
        this.s3Host = `https://${process.env.AWS_S3_BUCKET}.s3.sa-east-1.amazonaws.com`;
        this.cdnHost = process.env.CDN_HOST || 'cdnHost';
        this.realtimeUri = process.env.REALTIME_URI || '';
        this.corsOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
        this.dailyApiKey = process.env.DAILY_API_KEY || '';
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
