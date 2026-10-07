import type { InstallOs, ParamsOutput } from './params-machine';

// Client of the executable service (apps/executable/src/server.ts), which
// creates the installer with the collected params embedded and uploads it to
// S3.

const PLATFORMS: Record<InstallOs, string> = { Linux: 'linux', Windows: 'windows', macOS: 'macos' };
const REQUEST_TIMEOUT_MS = 30_000;

// Creates the installer for the collected params; resolves to its download URL.
export type CreateInstaller = (params: ParamsOutput) => Promise<string>;

// `baseUrl` is how the chatbot reaches the service; the download URL it
// answers with is a presigned S3 link the browser uses directly.
export const createInstallerClient =
    (baseUrl: string): CreateInstaller =>
    async ({ os, version, privateDnsHost, allowedApps, installOs }) => {
        if (!installOs) throw new Error('No install OS');
        const res = await fetch(`${baseUrl}/executables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: PLATFORMS[installOs],
                config: { os, version, privateDnsHost, allowedApps },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`Executable service answered ${res.status}: ${await res.text()}`);
        const { url } = (await res.json()) as { url: string };
        return url;
    };
