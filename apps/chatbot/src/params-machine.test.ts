import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { paramsMachine, parseAppIds, parseHostname, parseOs, parseVersion, parseYesNo } from './params-machine';

// Strings are typed answers; arrays are lists picked in the checklist.
const run = (...answers: (string | string[])[]) => {
    const actor = createActor(paramsMachine).start();
    for (const value of answers) {
        actor.send(Array.isArray(value) ? { type: 'ALLOWED_APPS', apps: value } : { type: 'ANSWER', value });
    }
    return actor.getSnapshot();
};

describe('parsers', () => {
    it('parses OS aliases', () => {
        expect(parseOs('1')).toBe('Android');
        expect(parseOs(' iPhone ')).toBe('iOS');
        expect(parseOs('windows')).toBeNull();
    });

    it('parses versions', () => {
        expect(parseVersion('v17.4.1')).toBe('17.4.1');
        expect(parseVersion('abc')).toBeNull();
    });

    it('parses yes/no in en and pt', () => {
        expect(parseYesNo('Sim')).toBe(true);
        expect(parseYesNo('não')).toBe(false);
        expect(parseYesNo('maybe')).toBeNull();
    });

    it('parses private DNS hostnames', () => {
        expect(parseHostname(' DNS.AdGuard.com ')).toBe('dns.adguard.com');
        expect(parseHostname('dns.google.')).toBe('dns.google');
        expect(parseHostname('https://dns.google')).toBeNull();
        expect(parseHostname('dns.google:853')).toBeNull();
        expect(parseHostname('localhost')).toBeNull();
        expect(parseHostname('8.8.8.8')).toBeNull();
    });

    it('validates the allowed app list', () => {
        expect(parseAppIds(['com.whatsapp', 'com.Slack', 'com.whatsapp'])).toEqual(['com.whatsapp', 'com.Slack']);
        expect(parseAppIds([])).toEqual([]);
        expect(parseAppIds(['whatsapp'])).toBeNull();
        expect(parseAppIds([42])).toBeNull();
        expect(parseAppIds('com.whatsapp')).toBeNull();
    });
});

describe('paramsMachine', () => {
    it('collects params and finishes', () => {
        const snapshot = run('2', '17.4', 'yes', 'dns.adguard.com', ['com.whatsapp', 'com.Slack'], 'yes');
        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({
            os: 'iOS',
            version: '17.4',
            privateDns: true,
            privateDnsHost: 'dns.adguard.com',
            allowedApps: ['com.whatsapp', 'com.Slack'],
        });
    });

    it('asks the private DNS hostname only when there is one', () => {
        expect(run('1', '14', 'yes').value).toBe('askDnsHost');
        expect(run('1', '14', 'no').value).toBe('askAllowedApps');

        const invalid = run('1', '14', 'yes', 'not a host');
        expect(invalid.value).toBe('askDnsHost');
        expect(invalid.context.error).toMatch(/hostname/);
    });

    it('rejects invalid answers without advancing', () => {
        const snapshot = run('windows');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.error).toMatch(/Android/);
    });

    it('takes the allowed apps only from the checklist', () => {
        const typed = run('1', '14', 'no', 'com.whatsapp');
        expect(typed.value).toBe('askAllowedApps');
        expect(typed.context.error).toMatch(/use the button to select the allowed apps/);

        const invalid = run('1', '14', 'no', ['whatsapp']);
        expect(invalid.value).toBe('askAllowedApps');
        expect(invalid.context.error).toMatch(/Invalid app list/);
    });

    it('starts over when the summary is rejected', () => {
        const snapshot = run('1', '14', 'no', [], 'no');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.os).toBeNull();
    });

    it('restarts on RESTART', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'ANSWER', value: '1' });
        actor.send({ type: 'RESTART' });
        expect(actor.getSnapshot().value).toBe('askOs');
        expect(actor.getSnapshot().context.os).toBeNull();
    });
});
