import { keycloakApi } from './keycloak';
// Relative import — see the comment in ./iam.ts for why '#properties' can't
// be trusted to resolve to realtime's own Properties under the integration
// test suite's merged Jest config.
import properties from '../properties';

let cachedToken: string | null = null;
let expiresAt = 0;

// IAM's GetKeycloakUser middleware accepts a "mock:<base64 JSON>" token when
// NODE_ENV=test, bypassing the real Keycloak roundtrip (see
// apps/iam/src/middleware/get_keycloak_user.ts). Tests spin up an ephemeral
// IAM instance with no real Keycloak behind it, so this is the only way
// server-to-server calls (createIamClient) can authenticate there.
const TEST_SERVICE_TOKEN = 'mock:' + Buffer.from(JSON.stringify({
    sub: 'realtime-service',
    email: 'realtime-service@internal',
    given_name: 'Realtime',
    family_name: 'Service',
})).toString('base64');

export async function getServiceToken(): Promise<string> {
    if (properties.nodeEnv === 'test') {
        return TEST_SERVICE_TOKEN;
    }

    if (cachedToken && Date.now() < expiresAt) {
        return cachedToken;
    }

    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: properties.keycloakClientId,
        client_secret: properties.keycloakClientSecret,
    });

    const { data } = await keycloakApi.post<{ access_token: string; expires_in: number }>(
        '/protocol/openid-connect/token',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    cachedToken = data.access_token;
    expiresAt = Date.now() + (data.expires_in - 30) * 1000;

    return cachedToken;
}
