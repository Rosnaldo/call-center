import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { paramsMachine, parseAppIds, parseOs, parseVersion, parseYesNo } from './params-machine';

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
        const snapshot = run('2', '17.4', 'yes', ['com.whatsapp', 'com.Slack'], 'yes');
        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({
            os: 'iOS',
            version: '17.4',
            privateVpn: true,
            allowedApps: ['com.whatsapp', 'com.Slack'],
        });
    });

    it('rejects invalid answers without advancing', () => {
        const snapshot = run('windows');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.error).toMatch(/Android/);
    });

    it('takes the allowed apps only from the checklist', () => {
        const typed = run('1', '14', 'no', 'com.whatsapp');
        expect(typed.value).toBe('askAllowedApps');
        expect(typed.context.error).toMatch(/select the allowed apps in the list/);

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
