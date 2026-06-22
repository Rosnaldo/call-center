export default {
    nodeEnv: process.env.NODE_ENV || '',
    port: process.env.PORT || 5003,
    isRuntime: process.env.RUNTIME || '',
    keycloakUri: process.env.KEYCLOAK_URI || '',
    keycloakClientId: process.env.KEYCLOAK_CLIENT_ID || '',
    keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
    iamUri: process.env.IAM_URI || 'http://localhost:5002',
};
