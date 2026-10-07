import { assign, setup } from 'xstate';

export type MobileOs = 'Android' | 'iOS';

export interface ParamsContext {
    os: MobileOs | null;
    version: string | null;
    privateDns: boolean | null;
    // Hostname of the private DNS, when there is one.
    privateDnsHost: string | null;
    allowedApps: string[] | null;
    error: string | null;
}

export interface ParamsOutput {
    os: MobileOs | null;
    version: string | null;
    privateDns: boolean | null;
    privateDnsHost: string | null;
    allowedApps: string[] | null;
}

export type ParamsEvent =
    | { type: 'ANSWER'; value: string }
    | { type: 'ALLOWED_APPS'; apps: unknown }
    | { type: 'RESTART' };

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

// Private DNS hostname, as in Android's Private DNS setting (e.g. dns.adguard.com):
// dot-separated labels ending in an alphabetic TLD. No scheme, port or path.
const HOSTNAME = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const parseHostname = (text: unknown): string | null => {
    const value = normalize(text).replace(/\.$/, '');
    return HOSTNAME.test(value) ? value : null;
};

// Android application id, as in play.google.com/store/apps/details?id=<id>:
// two or more dot-separated segments, each starting with a letter.
const APP_ID = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
export const MAX_ALLOWED_APPS = 100;

export const isAppId = (id: unknown): id is string => typeof id === 'string' && APP_ID.test(id);

// The list picked in the web app's checklist, deduplicated. An empty list is
// valid (no app allowed); null when it isn't a list of Google Play app ids.
export const parseAppIds = (apps: unknown): string[] | null => {
    if (!Array.isArray(apps) || apps.length > MAX_ALLOWED_APPS) return null;
    if (!apps.every(isAppId)) return null;
    return [...new Set(apps as string[])];
};

const initialContext: ParamsContext = {
    os: null,
    version: null,
    privateDns: null,
    privateDnsHost: null,
    allowedApps: null,
    error: null,
};

// Guards/actions are typed with every event, so they read payloads defensively.
const answerOf = (event: ParamsEvent): string => (event.type === 'ANSWER' ? event.value : '');
const appsOf = (event: ParamsEvent): unknown => (event.type === 'ALLOWED_APPS' ? event.apps : undefined);

export const paramsMachine = setup({
    types: {
        context: {} as ParamsContext,
        events: {} as ParamsEvent,
        output: {} as ParamsOutput,
    },
    guards: {
        isValidOs: ({ event }) => parseOs(answerOf(event)) !== null,
        isValidVersion: ({ event }) => parseVersion(answerOf(event)) !== null,
        isValidHostname: ({ event }) => parseHostname(answerOf(event)) !== null,
        isValidAppIds: ({ event }) => parseAppIds(appsOf(event)) !== null,
        isYes: ({ event }) => parseYesNo(answerOf(event)) === true,
        isNo: ({ event }) => parseYesNo(answerOf(event)) === false,
    },
    actions: {
        saveOs: assign({ os: ({ event }) => parseOs(answerOf(event)), error: null }),
        saveVersion: assign({ version: ({ event }) => parseVersion(answerOf(event)), error: null }),
        saveDns: assign({ privateDns: ({ event }) => parseYesNo(answerOf(event)), privateDnsHost: null, error: null }),
        saveDnsHost: assign({ privateDnsHost: ({ event }) => parseHostname(answerOf(event)), error: null }),
        saveAllowedApps: assign({ allowedApps: ({ event }) => parseAppIds(appsOf(event)), error: null }),
        clearError: assign({ error: null }),
        reset: assign(() => ({ ...initialContext })),
        rejectOs: assign({ error: 'Please choose 1 (Android) or 2 (iOS).' }),
        rejectVersion: assign({ error: 'Please enter a version number such as 14 or 17.4.1.' }),
        rejectHostname: assign({ error: 'Please enter the private DNS hostname, such as dns.adguard.com.' }),
        rejectYesNo: assign({ error: 'Please answer yes or no.' }),
        rejectAppIds: assign({ error: 'Invalid app list. Please select the allowed apps again.' }),
        // The list comes from the web app's checklist, not from typed text.
        rejectTypedApps: assign({ error: 'Please use the button to select the allowed apps.' }),
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
                    { guard: 'isValidVersion', target: 'askDns', actions: 'saveVersion' },
                    { actions: 'rejectVersion' },
                ],
            },
        },
        askDns: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'askDnsHost', actions: 'saveDns' },
                    { guard: 'isNo', target: 'askAllowedApps', actions: 'saveDns' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        askDnsHost: {
            on: {
                ANSWER: [
                    { guard: 'isValidHostname', target: 'askAllowedApps', actions: 'saveDnsHost' },
                    { actions: 'rejectHostname' },
                ],
            },
        },
        askAllowedApps: {
            on: {
                ALLOWED_APPS: [
                    { guard: 'isValidAppIds', target: 'confirm', actions: 'saveAllowedApps' },
                    { actions: 'rejectAppIds' },
                ],
                ANSWER: { actions: 'rejectTypedApps' },
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
        privateDns: context.privateDns,
        privateDnsHost: context.privateDnsHost,
        allowedApps: context.allowedApps,
    }),
});

export type PromptState = 'askOs' | 'askVersion' | 'askDns' | 'askDnsHost' | 'askAllowedApps' | 'confirm';
