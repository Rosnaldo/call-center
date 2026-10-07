// Keycloak service token (client_credentials) the chatbot authenticates with
// on other services, like the executable service (see installer.ts). Same
// flow as realtime's apis/service_token.ts.

const REQUEST_TIMEOUT_MS = 10_000;
// Renewed this long before it expires, so it doesn't expire in flight.
const EXPIRY_MARGIN_MS = 30_000;

export type GetToken = () => Promise<string>;

export interface ServiceTokenOptions {
    keycloakUri: string;
    clientId: string;
    clientSecret: string;
}

export const createServiceTokenProvider = ({ keycloakUri, clientId, clientSecret }: ServiceTokenOptions): GetToken => {
    let cached: { token: string; expiresAt: number } | null = null;
    // Concurrent callers share one request.
    let pending: Promise<string> | null = null;

    const request = async (): Promise<string> => {
        const res = await fetch(`${keycloakUri}/realms/poc/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`Keycloak answered ${res.status}: ${await res.text()}`);
        const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
        cached = { token: access_token, expiresAt: Date.now() + expires_in * 1000 - EXPIRY_MARGIN_MS };
        return access_token;
    };

    return async () => {
        if (cached && Date.now() < cached.expiresAt) return cached.token;
        pending ??= request().finally(() => {
            pending = null;
        });
        return pending;
    };
};

// From KEYCLOAK_URI, KEYCLOAK_CLIENT_ID and KEYCLOAK_CLIENT_SECRET. Without
// them only the token requests fail (so only the installer does), not the
// whole chatbot.
export const serviceTokenFromEnv = (): GetToken => {
    const { KEYCLOAK_URI, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET } = process.env;
    if (!KEYCLOAK_URI || !KEYCLOAK_CLIENT_ID || !KEYCLOAK_CLIENT_SECRET) {
        const message = 'KEYCLOAK_URI, KEYCLOAK_CLIENT_ID and KEYCLOAK_CLIENT_SECRET must be set';
        console.warn(`[service-token] ${message}; installers can't be created`);
        return () => Promise.reject(new Error(message));
    }
    return createServiceTokenProvider({
        keycloakUri: KEYCLOAK_URI,
        clientId: KEYCLOAK_CLIENT_ID,
        clientSecret: KEYCLOAK_CLIENT_SECRET,
    });
};
