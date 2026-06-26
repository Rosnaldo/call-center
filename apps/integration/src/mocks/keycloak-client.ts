// Stub for @keycloak/keycloak-admin-client (ESM-only, not compatible with Jest CJS).
// auth() sets accessToken to a mock: token that IAM's test bypass can validate.
const SERVICE_PAYLOAD = {
    sub: 'realtime-service',
    email: 'realtime@service.internal',
    given_name: 'Realtime',
    family_name: 'Service',
};

export default class KcAdminClient {
    accessToken?: string;
    constructor(_opts?: unknown) {}
    async auth(_opts?: unknown): Promise<void> {
        this.accessToken =
            'mock:' + Buffer.from(JSON.stringify(SERVICE_PAYLOAD)).toString('base64');
    }
    users = { find: async () => [] };
    roles = { find: async () => [] };
}
