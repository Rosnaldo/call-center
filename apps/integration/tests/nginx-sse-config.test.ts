import fs from 'node:fs';
import path from 'node:path';

// Regression test for a real incident: nginx buffers proxied responses by
// default, so IAM's SSE stream (apps/iam/src/routes/call_events.ts) had its
// res.write() pushes sit in nginx's buffer instead of reaching the browser's
// EventSource, even though IAM and the browser's request/token were both
// fine. The fix is a dedicated location block ahead of the generic /iam/
// one — this can't be caught by apps/integration's other tests, which talk
// to IAM directly and never go through nginx at all. This test doesn't spin
// up nginx either; it just asserts the config file itself still carries the
// directives the fix depends on, so a future edit that drops them fails CI
// instead of silently reintroducing the bug.

function extractLocationBlock(conf: string, locationPath: string): string {
    const start = conf.indexOf(`location ${locationPath} {`);
    if (start === -1) {
        throw new Error(`location ${locationPath} not found in nginx conf`);
    }
    const end = conf.indexOf('\n        }', start);
    return conf.slice(start, end);
}

describe.each([
    ['dev', path.resolve(__dirname, '../../nginx/dev/nginx.conf')],
    ['prod', path.resolve(__dirname, '../../nginx/prod/https/nginx.conf')],
])('%s nginx config — /iam/call-events/ SSE location', (_env, confPath) => {
    let block: string;

    beforeAll(() => {
        const conf = fs.readFileSync(confPath, 'utf-8');
        block = extractLocationBlock(conf, '/iam/call-events/');
    });

    it('proxies to the IAM call-events route', () => {
        expect(block).toMatch(/proxy_pass\s+http:\/\/iam:5002\/call-events\/;/);
    });

    it('disables response buffering, so streamed writes reach the client immediately', () => {
        expect(block).toMatch(/proxy_buffering\s+off;/);
    });

    it('uses HTTP/1.1 with keep-alive for the long-lived connection', () => {
        expect(block).toMatch(/proxy_http_version\s+1\.1;/);
        expect(block).toMatch(/proxy_set_header\s+Connection\s+['"]{2};/);
    });

    it('sets a read timeout long enough to outlive the heartbeat interval', () => {
        const match = block.match(/proxy_read_timeout\s+(\d+)s;/);
        expect(match).toBeTruthy();
        // heartbeat in call_events.ts is every 20s — this just guards against
        // the timeout regressing back down near/under that.
        expect(Number(match![1])).toBeGreaterThanOrEqual(300);
    });
});
