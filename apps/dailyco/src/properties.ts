export default {
    nodeEnv: process.env.NODE_ENV || '',
    port: process.env.PORT || 5003,
    mongoUri: process.env.MONGO_URI || '',
    keycloakUri: process.env.KEYCLOAK_URI || '',
    keycloakClientId: process.env.KEYCLOAK_CLIENT_ID || '',
    keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    isRuntime: process.env.RUNTIME || '',
    s3Host: `https://${process.env.AWS_S3_BUCKET}.s3.sa-east-1.amazonaws.com`,
    cdnHost: process.env.CDN_HOST || 'cdnHost',
};
