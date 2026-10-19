import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { applyFields, paramsMachine, savedOf, stepOf, type FieldValues, parseAppIds, parseAppSchedules, parseAppVersion, parseBlockedTermsList, parseHostname, parseInstallOs, parseOs, parseVersion, parseYesNo } from './params-machine';

// Strings are typed answers; arrays are the apps picked in the checklist;
// { terms } is the words added in the blocked-words modal; { fill } is the
// fields read from free text.
type Answer = string | string[] | { terms: string[] } | { fill: FieldValues } | { schedules: unknown };
const run = (...answers: Answer[]) => {
    const actor = createActor(paramsMachine).start();
    // Proceeds past the opening and the intro first.
    for (const value of ['proceed', 'proceed', ...answers] as Answer[]) {
        if (Array.isArray(value)) actor.send({ type: 'ALLOWED_APPS', apps: value });
        else if (typeof value === 'object' && 'fill' in value) actor.send({ type: 'FILL', fields: value.fill });
        else if (typeof value === 'object' && 'schedules' in value) actor.send({ type: 'APP_SCHEDULES', schedules: value.schedules });
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
        const schedules = { 'com.Slack': { mon: [{ start: '08:00', end: '18:00' }] } };
        const snapshot = run('2', '17.4', 'yes', 'dns.adguard.com', ['com.whatsapp', 'com.Slack'], 'yes', { schedules }, 'yes', 'yes', { terms: ['bokup', 'semi'] }, 'windows', 'v1.2.0', 'yes');
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
            appSchedules: { 'com.Slack': { mon: [{ start: '08:00', end: '18:00' }] } },
        });
    });

    it('only goes forward from the opening', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'ANSWER', value: 'não' });
        expect(stepOf(actor.getSnapshot())).toBe('askStart');
        expect(actor.getSnapshot().context.error).toBe('errors.proceed');

        actor.send({ type: 'ANSWER', value: 'Prosseguir' });
        expect(stepOf(actor.getSnapshot())).toBe('intro');

        actor.send({ type: 'ANSWER', value: 'Prosseguir' });
        expect(stepOf(actor.getSnapshot())).toBe('askOs');
    });

    it('asks about raw IPs, then whether to add blocked words, after the allowed apps', () => {
        expect(stepOf(run('1', '14', 'no', []))).toBe('askBlockRawIp');
        expect(stepOf(run('1', '14', 'no', [], 'yes'))).toBe('askBlockTerms');

        // No words: skips the modal straight to the install OS, empty list.
        const none = run('1', '14', 'no', [], 'no', 'no');
        expect(stepOf(none)).toBe('askInstallOs');
        expect(none.context.blockRawIp).toBe(false);
        expect(none.context.blockedTerms).toEqual([]);

        // Yes: the modal collects the words (a BLOCKED_TERMS event).
        expect(stepOf(run('1', '14', 'no', [], 'yes', 'yes'))).toBe('collectBlockedTerms');
        const filled = run('1', '14', 'no', [], 'yes', 'yes', { terms: ['semi', 'bokup'] });
        expect(stepOf(filled)).toBe('askInstallOs');
        expect(filled.context.blockedTerms).toEqual(['semi', 'bokup']);

        // A typed answer in the modal step is rejected; bad words are rejected.
        expect(run('1', '14', 'no', [], 'yes', 'yes', 'semi').context.error).toBe('errors.typedTerms');
        expect(run('1', '14', 'no', [], 'yes', 'yes', { terms: ['a'] }).context.error).toBe('errors.blockedTerms');
    });

    it('asks the USB install OS after the blocked words', () => {
        expect(run('1', '14', 'no', [], 'no', 'no', 'android').context.error).toBe('errors.installOs');
    });

    it('asks the configuration version after the USB install OS', () => {
        expect(stepOf(run('1', '14', 'no', [], 'no', 'no', 'linux'))).toBe('askAppVersion');

        const invalid = run('1', '14', 'no', [], 'no', 'no', 'linux', 'first');
        expect(stepOf(invalid)).toBe('askAppVersion');
        expect(invalid.context.error).toBe('errors.appVersion');

        expect(stepOf(run('1', '14', 'no', [], 'no', 'no', 'linux', '2.0.1'))).toBe('confirm');
    });

    it('asks the private DNS hostname only when there is one', () => {
        expect(stepOf(run('1', '14', 'yes'))).toBe('askDnsHost');
        expect(stepOf(run('1', '14', 'no'))).toBe('askAllowedApps');

        const invalid = run('1', '14', 'yes', 'not a host');
        expect(stepOf(invalid)).toBe('askDnsHost');
        expect(invalid.context.error).toBe('errors.hostname');
    });

    it('rejects invalid answers without advancing', () => {
        const snapshot = run('windows');
        expect(stepOf(snapshot)).toBe('askOs');
        expect(snapshot.context.error).toBe('errors.os');
    });

    it('takes the allowed apps only from the checklist', () => {
        const typed = run('1', '14', 'no', 'com.whatsapp');
        expect(stepOf(typed)).toBe('askAllowedApps');
        expect(typed.context.error).toBe('errors.typedApps');

        const invalid = run('1', '14', 'no', ['whatsapp']);
        expect(stepOf(invalid)).toBe('askAllowedApps');
        expect(invalid.context.error).toBe('errors.appIds');
    });

    it('starts over when the summary is rejected, keeping the apps and words', () => {
        const snapshot = run('1', '14', 'no', ['com.whatsapp'], 'no', 'no', 'no', 'linux', '1.0', 'no');
        expect(stepOf(snapshot)).toBe('askOs');
        expect(snapshot.context).toMatchObject({
            os: null,
            version: null,
            privateDns: null,
            blockRawIp: null,
            installOs: null,
            appVersion: null,
            allowedApps: ['com.whatsapp'],
            blockedTerms: [],
            wantsBlockedTerms: false,
            appSchedules: {},
        });
    });

    it('goes back to the opening on RESET, keeping the apps and words', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'ANSWER', value: 'proceed' });
        actor.send({ type: 'ANSWER', value: 'proceed' });
        actor.send({ type: 'FILL', fields: { os: 'Android', privateDnsHost: 'dns.adguard.com', blockedTerms: ['bet'] } });
        actor.send({ type: 'ALLOWED_APPS', apps: ['com.whatsapp'] });
        actor.send({ type: 'RESET' });
        expect(stepOf(actor.getSnapshot())).toBe('askStart');
        expect(actor.getSnapshot().context).toMatchObject({
            os: null,
            privateDns: null,
            privateDnsHost: null,
            allowedApps: ['com.whatsapp'],
            blockedTerms: ['bet'],
            wantsBlockedTerms: true,
        });
    });
});

describe('paramsMachine slot filling', () => {
    // Everything answered up to the confirmation.
    const TO_CONFIRM: Answer[] = ['1', '14', 'no', [], 'no', 'no', 'linux', '1.0'];

    it('fills several fields at once and skips the answered questions', () => {
        const snapshot = run({ fill: { os: 'iPhone', version: '17.4', privateDns: false } });
        expect(stepOf(snapshot)).toBe('askAllowedApps');
        expect(snapshot.context).toMatchObject({ os: 'iOS', version: '17.4', privateDns: false, error: null });
    });

    it('fills fields of later questions, which are then skipped', () => {
        const snapshot = run({ fill: { installOs: 'Windows', blockRawIp: true } }, '1', '14', 'no', []);
        expect(stepOf(snapshot)).toBe('askBlockTerms');
        expect(snapshot.context).toMatchObject({ installOs: 'Windows', blockRawIp: true });
    });

    it('validates each field with its parser, keeping the valid ones', () => {
        const snapshot = run('1', '14', { fill: { version: 'dezessete', installOs: 'win' } });
        expect(stepOf(snapshot)).toBe('askDns');
        expect(snapshot.context).toMatchObject({ version: '14', installOs: 'Windows', error: 'errors.version' });
    });

    it('rejects a fill with no valid field without moving', () => {
        const snapshot = run({ fill: { os: 'Windows Phone' } });
        expect(stepOf(snapshot)).toBe('askOs');
        expect(snapshot.context).toMatchObject({ os: null, error: 'errors.os', fillCount: 0 });
    });

    it('takes a hostname as having a private DNS', () => {
        const snapshot = run('1', '14', { fill: { privateDnsHost: 'DNS.Google' } });
        expect(stepOf(snapshot)).toBe('askAllowedApps');
        expect(snapshot.context).toMatchObject({ privateDns: true, privateDnsHost: 'dns.google' });
    });

    it('goes back to a question a correction leaves unanswered', () => {
        const snapshot = run('1', '14', 'no', [], 'no', 'no', { fill: { privateDns: true } });
        expect(stepOf(snapshot)).toBe('askDnsHost');
        expect(stepOf(run('1', '14', 'no', [], 'no', 'no', { fill: { privateDns: true } }, 'dns.google'))).toBe('askInstallOs');
    });

    it('takes the blocked words from text, skipping the modal', () => {
        const words = run('1', '14', 'no', [], 'yes', { fill: { blockedTerms: ['Cassino', 'aposta'] } });
        expect(stepOf(words)).toBe('askInstallOs');
        expect(words.context).toMatchObject({ wantsBlockedTerms: true, blockedTerms: ['cassino', 'aposta'] });

        const none = run('1', '14', 'no', [], 'yes', { fill: { blockedTerms: [] } });
        expect(stepOf(none)).toBe('askInstallOs');
        expect(none.context).toMatchObject({ wantsBlockedTerms: false, blockedTerms: [] });
    });

    it('corrects fields on the confirmation and confirms again', () => {
        const before = run(...TO_CONFIRM).context.fillCount;
        const snapshot = run(...TO_CONFIRM, { fill: { version: '15' } });
        expect(stepOf(snapshot)).toBe('confirm');
        expect(snapshot.context).toMatchObject({ version: '15', fillCount: before + 1 });
        expect(run(...TO_CONFIRM, { fill: { version: '15' } }, 'yes').output).toMatchObject({ version: '15' });
    });

    it('ignores fills before the setup starts', () => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'FILL', fields: { os: 'android' } });
        expect(stepOf(actor.getSnapshot())).toBe('askStart');
        expect(actor.getSnapshot().context.os).toBeNull();
    });

    it('clears the hostname when there is no private DNS any more', () => {
        const context = run('1', '14', 'yes', 'dns.google').context;
        expect(applyFields(context, { privateDns: false })).toMatchObject({ privateDns: false, privateDnsHost: null });
        expect(applyFields(context, { privateDns: 'sim' })).toMatchObject({ privateDns: true, privateDnsHost: 'dns.google' });
    });
});

describe('paramsMachine saved configuration', () => {
    const SAVED = {
        os: 'Android',
        version: '14',
        privateDns: true,
        privateDnsHost: 'dns.google',
        allowedApps: ['com.whatsapp'],
        installOs: 'Linux',
        appVersion: '1.2.0',
        blockRawIp: true,
        blockedTerms: ['bet'],
    };
    const opened = (saved: unknown) => {
        const actor = createActor(paramsMachine).start();
        actor.send({ type: 'LOCALSTORAGE', params: saved });
        actor.send({ type: 'ANSWER', value: 'proceed' });
        actor.send({ type: 'ANSWER', value: 'proceed' });
        return actor;
    };

    it('validates it like the answers, and takes only a complete one', () => {
        // Kept before app schedules existed: none.
        expect(savedOf(SAVED)).toEqual({ ...SAVED, appSchedules: {} });
        const schedules = { 'com.whatsapp': { sat: [{ start: '10:00', end: '12:00' }] } };
        expect(savedOf({ ...SAVED, appSchedules: schedules })).toEqual({ ...SAVED, appSchedules: schedules });
        expect(savedOf({ ...SAVED, appSchedules: { 'com.other': schedules['com.whatsapp'] } })).toBeNull();
        expect(savedOf({ ...SAVED, os: 'iPhone', privateDnsHost: 'DNS.Google' })).toMatchObject({ os: 'iOS', privateDnsHost: 'dns.google' });
        expect(savedOf({ ...SAVED, version: 'abc' })).toBeNull();
        expect(savedOf({ ...SAVED, allowedApps: ['not an id'] })).toBeNull();
        expect(savedOf({ ...SAVED, installOs: null })).toBeNull();
        expect(savedOf('garbage')).toBeNull();
    });

    it('offers it after the intro and finishes with it', () => {
        const actor = opened(SAVED);
        expect(stepOf(actor.getSnapshot())).toBe('askReuse');
        actor.send({ type: 'ANSWER', value: 'sim' });
        expect(actor.getSnapshot().status).toBe('done');
        expect(actor.getSnapshot().output).toEqual({ ...SAVED, appSchedules: {} });
    });

    it('asks every param when it is declined', () => {
        const actor = opened(SAVED);
        actor.send({ type: 'ANSWER', value: 'no' });
        expect(stepOf(actor.getSnapshot())).toBe('askOs');
        expect(actor.getSnapshot().context.os).toBeNull();
    });

    it('skips the question without a valid configuration', () => {
        expect(stepOf(opened({ ...SAVED, version: 'abc' }).getSnapshot())).toBe('askOs');
        expect(stepOf(opened(null).getSnapshot())).toBe('askOs');
    });

    it('rejects anything but yes or no', () => {
        const actor = opened(SAVED);
        actor.send({ type: 'ANSWER', value: 'talvez' });
        expect(stepOf(actor.getSnapshot())).toBe('askReuse');
        expect(actor.getSnapshot().context.error).toBe('errors.yesNo');
    });
});

describe('paramsMachine taking a modal\'s list at another step', () => {
    const TO_CONFIRM: Answer[] = ['1', '14', 'no', ['com.whatsapp'], 'no', 'yes', { terms: ['bet'] }, 'linux', '1.0'];
    const answered = (...answers: Answer[]) => {
        const actor = createActor(paramsMachine).start();
        for (const value of ['proceed', 'proceed', ...answers] as Answer[]) {
            if (Array.isArray(value)) actor.send({ type: 'ALLOWED_APPS', apps: value });
            else if (typeof value === 'object' && 'terms' in value) actor.send({ type: 'BLOCKED_TERMS', terms: value.terms });
            else actor.send({ type: 'ANSWER', value: value as string });
        }
        return actor;
    };

    it('changes the apps at the confirmation and shows it again', () => {
        const actor = answered(...TO_CONFIRM);
        const { fillCount } = actor.getSnapshot().context;
        actor.send({ type: 'ALLOWED_APPS', apps: ['com.whatsapp', 'com.Slack'] });
        expect(stepOf(actor.getSnapshot())).toBe('confirm');
        expect(actor.getSnapshot().context).toMatchObject({ allowedApps: ['com.whatsapp', 'com.Slack'], fillCount: fillCount + 1 });
    });

    it('changes the words at a later step and stays there', () => {
        const actor = answered('1', '14', 'no', [], 'no', 'yes', { terms: ['bet'] });
        expect(stepOf(actor.getSnapshot())).toBe('askInstallOs');
        actor.send({ type: 'BLOCKED_TERMS', terms: ['bet', 'poker'] });
        expect(stepOf(actor.getSnapshot())).toBe('askInstallOs');
        expect(actor.getSnapshot().context.blockedTerms).toEqual(['bet', 'poker']);
    });

    it('takes words after saying no words, and empties them again', () => {
        const actor = answered('1', '14', 'no', [], 'no', 'no');
        actor.send({ type: 'BLOCKED_TERMS', terms: ['bet'] });
        expect(actor.getSnapshot().context).toMatchObject({ blockedTerms: ['bet'], wantsBlockedTerms: true });
        actor.send({ type: 'BLOCKED_TERMS', terms: [] });
        expect(actor.getSnapshot().context).toMatchObject({ blockedTerms: [], wantsBlockedTerms: false });
        expect(stepOf(actor.getSnapshot())).toBe('askInstallOs');
    });

    it('takes the apps before their question, which is then skipped', () => {
        const actor = answered('1', ['com.whatsapp']);
        expect(stepOf(actor.getSnapshot())).toBe('askVersion');
        for (const value of ['14', 'no']) actor.send({ type: 'ANSWER', value });
        expect(stepOf(actor.getSnapshot())).toBe('askAppSchedules');
    });

    it('rejects an invalid list without leaving the step', () => {
        const actor = answered(...TO_CONFIRM);
        actor.send({ type: 'ALLOWED_APPS', apps: ['not an id'] });
        expect(stepOf(actor.getSnapshot())).toBe('confirm');
        expect(actor.getSnapshot().context).toMatchObject({ allowedApps: ['com.whatsapp'], error: 'errors.appIds' });
    });
});


describe('paramsMachine app schedules', () => {
    const MON = { mon: [{ start: '08:00', end: '12:00' }] };

    it('parses ranges per app and day, sorted, leaving empty days out', () => {
        expect(
            parseAppSchedules(
                { 'com.whatsapp': { mon: [{ start: '14:00', end: '18:00' }, { start: '08:00', end: '12:00' }], tue: [] } },
                ['com.whatsapp'],
            ),
        ).toEqual({ 'com.whatsapp': { mon: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] } });
        expect(parseAppSchedules({}, null)).toEqual({});
        // Every day off: blocked all week.
        expect(parseAppSchedules({ 'com.whatsapp': {} }, ['com.whatsapp'])).toEqual({ 'com.whatsapp': {} });
    });

    it('rejects apps not allowed, unknown days and invalid, reversed or overlapping ranges', () => {
        const apps = ['com.whatsapp'];
        const week = (ranges: unknown) => ({ 'com.whatsapp': { mon: ranges } });
        expect(parseAppSchedules({ 'com.other': MON }, apps)).toBeNull();
        expect(parseAppSchedules({ 'com.whatsapp': { monday: MON.mon } }, apps)).toBeNull();
        expect(parseAppSchedules(week([{ start: '8:00', end: '12:00' }]), apps)).toBeNull();
        expect(parseAppSchedules(week([{ start: '22:00', end: '02:00' }]), apps)).toBeNull();
        expect(parseAppSchedules(week([{ start: '08:00', end: '12:00' }, { start: '11:00', end: '13:00' }]), apps)).toBeNull();
        const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        const ranges = (count: number) => Array.from({ length: count }, (_, i) => ({ start: time(i * 50), end: time(i * 50 + 20) }));
        expect(parseAppSchedules(week(ranges(24)), apps)).not.toBeNull();
        expect(parseAppSchedules(week(ranges(25)), apps)).toBeNull();
        expect(parseAppSchedules([], apps)).toBeNull();
    });

    it('asks for them after the apps, and skips them when declined', () => {
        const declined = run('1', '14', 'no', ['com.whatsapp'], 'no');
        expect(stepOf(declined)).toBe('askBlockRawIp');
        expect(declined.context).toMatchObject({ appSchedules: {}, wantsAppSchedules: false });

        const wanted = run('1', '14', 'no', ['com.whatsapp'], 'yes');
        expect(stepOf(wanted)).toBe('collectAppSchedules');
        const set = run('1', '14', 'no', ['com.whatsapp'], 'yes', { schedules: { 'com.whatsapp': MON } });
        expect(stepOf(set)).toBe('askBlockRawIp');
        expect(set.context.appSchedules).toEqual({ 'com.whatsapp': MON });
    });

    it('rejects typed text and invalid schedules without leaving the step', () => {
        const typed = run('1', '14', 'no', ['com.whatsapp'], 'yes', 'seg 8 as 12');
        expect(stepOf(typed)).toBe('collectAppSchedules');
        expect(typed.context.error).toBe('errors.typedSchedules');
        const invalid = run('1', '14', 'no', ['com.whatsapp'], 'yes', { schedules: { 'com.other': MON } });
        expect(stepOf(invalid)).toBe('collectAppSchedules');
        expect(invalid.context.error).toBe('errors.appSchedules');
    });

    it('takes them on the summary, and drops the schedule of an app taken off the list', () => {
        const actor = createActor(paramsMachine).start();
        for (const value of ['proceed', 'proceed', '1', '14', 'no']) actor.send({ type: 'ANSWER', value });
        actor.send({ type: 'ALLOWED_APPS', apps: ['com.whatsapp', 'com.Slack'] });
        for (const value of ['no', 'no', 'no', 'linux', '1.0']) actor.send({ type: 'ANSWER', value });
        expect(stepOf(actor.getSnapshot())).toBe('confirm');

        actor.send({ type: 'APP_SCHEDULES', schedules: { 'com.whatsapp': MON, 'com.Slack': MON } });
        expect(stepOf(actor.getSnapshot())).toBe('confirm');
        actor.send({ type: 'ALLOWED_APPS', apps: ['com.Slack'] });
        expect(actor.getSnapshot().context).toMatchObject({ appSchedules: { 'com.Slack': MON }, wantsAppSchedules: true });
        actor.send({ type: 'ALLOWED_APPS', apps: [] });
        expect(actor.getSnapshot().context).toMatchObject({ appSchedules: {}, wantsAppSchedules: false });
    });

    it('keeps them on RESET, with the apps', () => {
        const actor = createActor(paramsMachine).start();
        for (const value of ['proceed', 'proceed', '1', '14', 'no']) actor.send({ type: 'ANSWER', value });
        actor.send({ type: 'ALLOWED_APPS', apps: ['com.whatsapp'] });
        actor.send({ type: 'ANSWER', value: 'yes' });
        actor.send({ type: 'APP_SCHEDULES', schedules: { 'com.whatsapp': MON } });
        actor.send({ type: 'RESET' });
        expect(actor.getSnapshot().context).toMatchObject({ allowedApps: ['com.whatsapp'], appSchedules: { 'com.whatsapp': MON } });
    });
});
