import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceTokenProvider } from './service-token';

const options = { keycloakUri: 'http://keycloak:8080/auth', clientId: 'chatbot', clientSecret: 'secret' };
const tokenResponse = (token: string, expiresIn = 300) =>
    new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), { status: 200 });

describe('createServiceTokenProvider', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('requests a client_credentials token and caches it', async () => {
        const fetch = vi.fn(async () => tokenResponse('t1'));
        vi.stubGlobal('fetch', fetch);
        const getToken = createServiceTokenProvider(options);

        expect(await Promise.all([getToken(), getToken()])).toEqual(['t1', 't1']);
        expect(await getToken()).toBe('t1');

        expect(fetch).toHaveBeenCalledTimes(1);
        const [target, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
        expect(target).toBe('http://keycloak:8080/auth/realms/poc/protocol/openid-connect/token');
        expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
            grant_type: 'client_credentials',
            client_id: 'chatbot',
            client_secret: 'secret',
        });
    });

    it('renews the token before it expires', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn().mockResolvedValueOnce(tokenResponse('t1', 60)).mockResolvedValueOnce(tokenResponse('t2', 60));
        vi.stubGlobal('fetch', fetch);
        const getToken = createServiceTokenProvider(options);

        expect(await getToken()).toBe('t1');
        vi.advanceTimersByTime(31_000);
        expect(await getToken()).toBe('t2');
    });

    it('fails when Keycloak does, and retries on the next call', async () => {
        const fetch = vi.fn().mockResolvedValueOnce(new Response('invalid_client', { status: 401 })).mockResolvedValueOnce(tokenResponse('t1'));
        vi.stubGlobal('fetch', fetch);
        const getToken = createServiceTokenProvider(options);

        await expect(getToken()).rejects.toThrow(/401/);
        expect(await getToken()).toBe('t1');
    });
});
