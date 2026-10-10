import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { paramsMachine, parseAppIds, parseAppVersion, parseHostname, parseInstallOs, parseOs, parseVersion, parseYesNo } from './params-machine';

// Strings are typed answers; arrays are lists picked in the checklist.
const run = (...answers: (string | string[])[]) => {
    const actor = createActor(paramsMachine).start();
    // Proceeds past the opening and the intro first.
    for (const value of ['proceed', 'proceed', ...answers]) {
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

    it('parses semantic configuration versions', () => {
        expect(parseAppVersion(' v1.2.0 ')).toBe('1.2.0');
        expect(parseAppVersion('2')).toBe('2');
        expect(parseAppVersion('1.2.3.4')).toBe('1.2.3.4');
        expect(parseAppVersion('1.2.3.4.5')).toBeNull();
        expect(parseAppVersion('1.2-beta')).toBeNull();
        expect(parseAppVersion('latest')).toBeNull();
    });

    it('parses yes/no in en and pt', () => {
        expect(parseYesNo('Sim')).toBe(true);
        expect(parseYesNo('não')).toBe(false);
        expect(parseYesNo('maybe')).toBeNull();
    });

    it('parses the USB install OS', () => {
        expect(parseInstallOs(' Linux ')).toBe('Linux');
        expect(parseInstallOs('win')).toBe('Windows');
        expect(parseInstallOs('Mac')).toBe('macOS');
        expect(parseInstallOs('android')).toBeNull();
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
        const snapshot = run('2', '17.4', 'yes', 'dns.adguard.com', ['com.whatsapp', 'com.Slack'], 'windows', 'v1.2.0', 'yes');
        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({
            os: 'iOS',
            version: '17.4',
            privateDns: true,
            privateDnsHost: 'dns.adguard.com',
            allowedApps: ['com.whatsapp', 'com.Slack'],
            installOs: 'Windows',
            appVersion: '1.2.0',
        });
    });

    it('only goes forward from the opening', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'ANSWER', value: 'não' });
        expect(actor.getSnapshot().value).toBe('askStart');
        expect(actor.getSnapshot().context.error).toBe('errors.proceed');

        actor.send({ type: 'ANSWER', value: 'Prosseguir' });
        expect(actor.getSnapshot().value).toBe('intro');

        actor.send({ type: 'ANSWER', value: 'Prosseguir' });
        expect(actor.getSnapshot().value).toBe('askOs');
    });

    it('asks the USB install OS after the allowed apps', () => {
        expect(run('1', '14', 'no', []).value).toBe('askInstallOs');

        const invalid = run('1', '14', 'no', [], 'android');
        expect(invalid.value).toBe('askInstallOs');
        expect(invalid.context.error).toBe('errors.installOs');
    });

    it('asks the configuration version after the USB install OS', () => {
        expect(run('1', '14', 'no', [], 'linux').value).toBe('askAppVersion');

        const invalid = run('1', '14', 'no', [], 'linux', 'first');
        expect(invalid.value).toBe('askAppVersion');
        expect(invalid.context.error).toBe('errors.appVersion');

        expect(run('1', '14', 'no', [], 'linux', '2.0.1').value).toBe('confirm');
    });

    it('asks the private DNS hostname only when there is one', () => {
        expect(run('1', '14', 'yes').value).toBe('askDnsHost');
        expect(run('1', '14', 'no').value).toBe('askAllowedApps');

        const invalid = run('1', '14', 'yes', 'not a host');
        expect(invalid.value).toBe('askDnsHost');
        expect(invalid.context.error).toBe('errors.hostname');
    });

    it('rejects invalid answers without advancing', () => {
        const snapshot = run('windows');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.error).toBe('errors.os');
    });

    it('takes the allowed apps only from the checklist', () => {
        const typed = run('1', '14', 'no', 'com.whatsapp');
        expect(typed.value).toBe('askAllowedApps');
        expect(typed.context.error).toBe('errors.typedApps');

        const invalid = run('1', '14', 'no', ['whatsapp']);
        expect(invalid.value).toBe('askAllowedApps');
        expect(invalid.context.error).toBe('errors.appIds');
    });

    it('starts over when the summary is rejected', () => {
        const snapshot = run('1', '14', 'no', [], 'linux', '1.0', 'no');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.os).toBeNull();
    });

    it('restarts on RESTART', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'ANSWER', value: 'proceed' });
        actor.send({ type: 'RESTART' });
        expect(actor.getSnapshot().value).toBe('askStart');
        expect(actor.getSnapshot().context.os).toBeNull();
    });
});
