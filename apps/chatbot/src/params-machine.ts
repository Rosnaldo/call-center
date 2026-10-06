import { assign, setup } from 'xstate';

export type MobileOs = 'Android' | 'iOS';

export interface ParamsContext {
    os: MobileOs | null;
    version: string | null;
    privateVpn: boolean | null;
    error: string | null;
}

export interface ParamsOutput {
    os: MobileOs | null;
    version: string | null;
    privateVpn: boolean | null;
}

export type ParamsEvent = { type: 'ANSWER'; value: string } | { type: 'RESTART' };

const OS_ALIASES: Record<string, MobileOs> = {
    android: 'Android',
    '1': 'Android',
    ios: 'iOS',
    iphone: 'iOS',
    '2': 'iOS',
};
const YES = ['y', 'yes', 's', 'sim'];
const NO = ['n', 'no', 'nao', 'não'];

const normalize = (text: unknown): string => String(text ?? '').trim().toLowerCase();

export const parseOs = (text: unknown): MobileOs | null => OS_ALIASES[normalize(text)] ?? null;

export const parseVersion = (text: unknown): string | null => {
    const value = normalize(text).replace(/^v/, '');
    return /^\d{1,2}(\.\d{1,3}){0,2}$/.test(value) ? value : null;
};

export const parseYesNo = (text: unknown): boolean | null => {
    const value = normalize(text);
    if (YES.includes(value)) return true;
    if (NO.includes(value)) return false;
    return null;
};

const initialContext: ParamsContext = { os: null, version: null, privateVpn: null, error: null };

// RESTART carries no value, so guards/actions read it defensively.
const answerOf = (event: ParamsEvent): string => (event.type === 'ANSWER' ? event.value : '');

export const paramsMachine = setup({
    types: {
        context: {} as ParamsContext,
        events: {} as ParamsEvent,
        output: {} as ParamsOutput,
    },
    guards: {
        isValidOs: ({ event }) => parseOs(answerOf(event)) !== null,
        isValidVersion: ({ event }) => parseVersion(answerOf(event)) !== null,
        isYesNo: ({ event }) => parseYesNo(answerOf(event)) !== null,
        isYes: ({ event }) => parseYesNo(answerOf(event)) === true,
        isNo: ({ event }) => parseYesNo(answerOf(event)) === false,
    },
    actions: {
        saveOs: assign({ os: ({ event }) => parseOs(answerOf(event)), error: null }),
        saveVersion: assign({ version: ({ event }) => parseVersion(answerOf(event)), error: null }),
        saveVpn: assign({ privateVpn: ({ event }) => parseYesNo(answerOf(event)), error: null }),
        clearError: assign({ error: null }),
        reset: assign(() => ({ ...initialContext })),
        rejectOs: assign({ error: 'Please choose 1 (Android) or 2 (iOS).' }),
        rejectVersion: assign({ error: 'Please enter a version number such as 14 or 17.4.1.' }),
        rejectYesNo: assign({ error: 'Please answer yes or no.' }),
    },
}).createMachine({
    id: 'mobileParams',
    context: { ...initialContext },
    initial: 'askOs',
    on: {
        RESTART: { target: '.askOs', actions: 'reset' },
    },
    states: {
        askOs: {
            on: {
                ANSWER: [
                    { guard: 'isValidOs', target: 'askVersion', actions: 'saveOs' },
                    { actions: 'rejectOs' },
                ],
            },
        },
        askVersion: {
            on: {
                ANSWER: [
                    { guard: 'isValidVersion', target: 'askVpn', actions: 'saveVersion' },
                    { actions: 'rejectVersion' },
                ],
            },
        },
        askVpn: {
            on: {
                ANSWER: [
                    { guard: 'isYesNo', target: 'confirm', actions: 'saveVpn' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        confirm: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'done', actions: 'clearError' },
                    { guard: 'isNo', target: 'askOs', actions: 'reset' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        done: {
            type: 'final',
        },
    },
    output: ({ context }) => ({
        os: context.os,
        version: context.version,
        privateVpn: context.privateVpn,
    }),
});

export type PromptState = 'askOs' | 'askVersion' | 'askVpn' | 'confirm';
