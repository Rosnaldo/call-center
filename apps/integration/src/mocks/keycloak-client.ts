// Stub for @keycloak/keycloak-admin-client (ESM-only, not compatible with Jest CJS).
// The integration tests don't use Keycloak; this stub satisfies the import.
export default class KcAdminClient {
    constructor(_opts?: unknown) {}
    async auth(_opts?: unknown): Promise<void> {}
    users = { find: async () => [] };
    roles = { find: async () => [] };
}
