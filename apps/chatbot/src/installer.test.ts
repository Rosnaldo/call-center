import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstallerClient } from './installer';

const params = {
    os: 'Android' as const,
    version: '14',
    privateDns: false,
    privateDnsHost: null,
    allowedApps: [],
    installOs: 'macOS' as const,
    appVersion: '1.0.0',
};

const getToken = async () => 'service-token';

describe('createInstallerClient', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('asks the service for the platform and returns the download URL', async () => {
        const download = 'https://bucket.s3.amazonaws.com/installers/abc/device-owner-installer-macos?X-Amz-Signature=x';
        const fetch = vi.fn(
            async () => new Response(JSON.stringify({ id: 'abc', filename: 'device-owner-installer-macos', url: download }), { status: 201 }),
        );
        vi.stubGlobal('fetch', fetch);

        const url = await createInstallerClient('http://executable:5005', getToken)(params);

        expect(url).toBe(download);
        const [target, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
        expect(target).toBe('http://executable:5005/executables');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer service-token');
        expect(JSON.parse(init.body as string)).toEqual({
            platform: 'macos',
            config: { os: 'Android', version: '14', privateDnsHost: null, allowedApps: [], appVersion: '1.0.0' },
        });
    });

    it('fails when the service does', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('No macos template', { status: 503 })));
        await expect(createInstallerClient('http://executable:5005', getToken)(params)).rejects.toThrow(/503/);
    });
});
