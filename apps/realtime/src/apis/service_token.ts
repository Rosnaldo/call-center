import { keycloakApi } from './keycloak';
import properties from '#properties';

let cachedToken: string | null = null;
let expiresAt = 0;

export async function getServiceToken(): Promise<string> {
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
