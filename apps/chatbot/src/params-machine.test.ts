import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { paramsMachine, parseOs, parseVersion, parseYesNo } from './params-machine';

const run = (...answers: string[]) => {
    const actor = createActor(paramsMachine).start();
    for (const value of answers) actor.send({ type: 'ANSWER', value });
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
});

describe('paramsMachine', () => {
    it('collects params and finishes', () => {
        const snapshot = run('2', '17.4', 'yes', 'yes');
        expect(snapshot.status).toBe('done');
        expect(snapshot.output).toEqual({ os: 'iOS', version: '17.4', privateVpn: true });
    });

    it('rejects invalid answers without advancing', () => {
        const snapshot = run('windows');
        expect(snapshot.value).toBe('askOs');
        expect(snapshot.context.error).toMatch(/Android/);
    });

    it('starts over when the summary is rejected', () => {
        const snapshot = run('1', '14', 'no', 'no');
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
