import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { paramsMachine, parseAppIds, parseAppVersion, parseBlockedTermsList, parseHostname, parseInstallOs, parseOs, parseVersion, parseYesNo } from './params-machine';

// Strings are typed answers; arrays are the apps picked in the checklist;
// { terms } is the words added in the blocked-words modal.
type Answer = string | string[] | { terms: string[] };
const run = (...answers: Answer[]) => {
    const actor = createActor(paramsMachine).start();
    // Proceeds past the opening and the intro first.
    for (const value of ['proceed', 'proceed', ...answers] as Answer[]) {
        if (Array.isArray(value)) actor.send({ type: 'ALLOWED_APPS', apps: value });
        else if (typeof value === 'object') actor.send({ type: 'BLOCKED_TERMS', terms: value.terms });
        else actor.send({ type: 'ANSWER', value });
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

    it('parses the blocked words from the modal', () => {
        expect(parseBlockedTermsList(['semi', ' BOKUP ', 'atashira'])).toEqual(['semi', 'bokup', 'atashira']);
        expect(parseBlockedTermsList(['semi', 'semi'])).toEqual(['semi']);
        expect(parseBlockedTermsList([])).toEqual([]);
        expect(parseBlockedTermsList(['a'])).toBeNull(); // too short
        expect(parseBlockedTermsList(['has space'])).toBeNull();
        expect(parseBlockedTermsList('semi')).toBeNull(); // not a list
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
        const snapshot = run('2', '17.4', 'yes', 'dns.adguard.com', ['com.whatsapp', 'com.Slack'], 'yes', 'yes', { terms: ['bokup', 'semi'] }, 'windows', 'v1.2.0', 'yes');
        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({
            os: 'iOS',
            version: '17.4',
            privateDns: true,
            privateDnsHost: 'dns.adguard.com',
            allowedApps: ['com.whatsapp', 'com.Slack'],
            installOs: 'Windows',
            appVersion: '1.2.0',
            blockRawIp: true,
            blockedTerms: ['bokup', 'semi'],
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

    it('asks about raw IPs, then whether to add blocked words, after the allowed apps', () => {
        expect(run('1', '14', 'no', []).value).toBe('askBlockRawIp');
        expect(run('1', '14', 'no', [], 'yes').value).toBe('askBlockTerms');

        // No words: skips the modal straight to the install OS, empty list.
        const none = run('1', '14', 'no', [], 'no', 'no');
        expect(none.value).toBe('askInstallOs');
        expect(none.context.blockRawIp).toBe(false);
        expect(none.context.blockedTerms).toEqual([]);

        // Yes: the modal collects the words (a BLOCKED_TERMS event).
        expect(run('1', '14', 'no', [], 'yes', 'yes').value).toBe('collectBlockedTerms');
        const filled = run('1', '14', 'no', [], 'yes', 'yes', { terms: ['semi', 'bokup'] });
        expect(filled.value).toBe('askInstallOs');
        expect(filled.context.blockedTerms).toEqual(['semi', 'bokup']);

        // A typed answer in the modal step is rejected; bad words are rejected.
        expect(run('1', '14', 'no', [], 'yes', 'yes', 'semi').context.error).toBe('errors.typedTerms');
        expect(run('1', '14', 'no', [], 'yes', 'yes', { terms: ['a'] }).context.error).toBe('errors.blockedTerms');
    });

    it('asks the USB install OS after the blocked words', () => {
        expect(run('1', '14', 'no', [], 'no', 'no', 'android').context.error).toBe('errors.installOs');
    });

    it('asks the configuration version after the USB install OS', () => {
        expect(run('1', '14', 'no', [], 'no', 'no', 'linux').value).toBe('askAppVersion');

        const invalid = run('1', '14', 'no', [], 'no', 'no', 'linux', 'first');
        expect(invalid.value).toBe('askAppVersion');
        expect(invalid.context.error).toBe('errors.appVersion');

        expect(run('1', '14', 'no', [], 'no', 'no', 'linux', '2.0.1').value).toBe('confirm');
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
        const snapshot = run('1', '14', 'no', [], 'no', 'no', 'linux', '1.0', 'no');
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
