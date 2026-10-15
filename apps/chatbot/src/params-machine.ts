import { assign, setup } from 'xstate';

export type MobileOs = 'Android' | 'iOS';
// The computer the device owner is installed from, over USB.
export type InstallOs = 'Linux' | 'Windows' | 'macOS';
// Concepts the "learn more" menu explains before the setup.
export const LEARN_TOPICS = ['privateDns', 'deviceOwner', 'browserGuard', 'rawIp', 'schedule', 'usbDebugging'] as const;
export type LearnTopic = (typeof LEARN_TOPICS)[number];

export interface ParamsContext {
    os: MobileOs | null;
    version: string | null;
    privateDns: boolean | null;
    // Hostname of the private DNS, when there is one.
    privateDnsHost: string | null;
    allowedApps: string[] | null;
    installOs: InstallOs | null;
    // Version of this configuration, shown by the device owner app (e.g. 1.2.0).
    appVersion: string | null;
    // Browser guard: whether addresses with a raw IP host are blocked, and the
    // words that block an address containing them.
    blockRawIp: boolean | null;
    blockedTerms: string[] | null;
    // The concept last explained in the "learn more" menu (null: the menu itself),
    // and how many were picked, so picking the same one again explains it again.
    learnTopic: LearnTopic | null;
    learnCount: number;
    // i18n key (under `chatbot.`) of the last answer's error.
    error: string | null;
}

export interface ParamsOutput {
    os: MobileOs | null;
    version: string | null;
    privateDns: boolean | null;
    privateDnsHost: string | null;
    allowedApps: string[] | null;
    installOs: InstallOs | null;
    appVersion: string | null;
    blockRawIp: boolean | null;
    blockedTerms: string[] | null;
}

export type ParamsEvent =
    | { type: 'ANSWER'; value: string }
    | { type: 'ALLOWED_APPS'; apps: unknown }
    | { type: 'BLOCKED_TERMS'; terms: unknown }
    | { type: 'RESTART' };

const OS_ALIASES: Record<string, MobileOs> = {
    android: 'Android',
    '1': 'Android',
    ios: 'iOS',
    iphone: 'iOS',
    '2': 'iOS',
};
const INSTALL_OS_ALIASES: Record<string, InstallOs> = {
    linux: 'Linux',
    windows: 'Windows',
    win: 'Windows',
    mac: 'macOS',
    macos: 'macOS',
    osx: 'macOS',
};
const YES = ['y', 'yes', 's', 'sim'];
const NO = ['n', 'no', 'nao', 'não'];
// The opening only goes forward; a typed yes counts too.
const PROCEED = ['proceed', 'prosseguir', ...YES];
const LEARN_MORE = ['learn', 'learn more', 'saber mais'];

const normalize = (text: unknown): string => String(text ?? '').trim().toLowerCase();

export const isProceedAnswer = (text: unknown): boolean => PROCEED.includes(normalize(text));

export const parseLearnTopic = (text: unknown): LearnTopic | null => {
    const value = String(text ?? '').trim();
    return (LEARN_TOPICS as readonly string[]).includes(value) ? (value as LearnTopic) : null;
};

export const parseOs = (text: unknown): MobileOs | null => OS_ALIASES[normalize(text)] ?? null;

export const parseInstallOs = (text: unknown): InstallOs | null => INSTALL_OS_ALIASES[normalize(text)] ?? null;

export const parseVersion = (text: unknown): string | null => {
    const value = normalize(text).replace(/^v/, '');
    return /^\d{1,2}(\.\d{1,3}){0,2}$/.test(value) ? value : null;
};

// Semantic version of the configuration: 1 to 4 numbers separated by dots.
export const parseAppVersion = (text: unknown): string | null => {
    const value = normalize(text).replace(/^v/, '');
    return /^\d{1,4}(\.\d{1,4}){0,3}$/.test(value) ? value : null;
};

// Words that block an address containing them: comma-separated, or one of
// NO_TERMS for none. Each is 2-40 letters, digits, '.', '-' or '_' (no spaces:
// it's matched inside URLs). Lowercased and deduplicated; null when invalid.
export const MAX_BLOCKED_TERMS = 100;
const NO_TERMS = ['none', 'nenhuma', 'nenhum', '-'];
const TERM = /^[\p{L}\p{N}._-]{2,40}$/u;

export const parseBlockedTerms = (text: unknown): string[] | null => {
    const value = normalize(text);
    if (NO_TERMS.includes(value)) return [];
    const terms = value.split(',').map((term) => term.trim()).filter(Boolean);
    if (!terms.length || terms.length > MAX_BLOCKED_TERMS || !terms.every((term) => TERM.test(term))) return null;
    return [...new Set(terms)];
};

// The words added in the web modal's tag input, lowercased and deduplicated.
// An empty list is valid (no word); null when it isn't a list of valid words.
export const parseBlockedTermsList = (terms: unknown): string[] | null => {
    if (!Array.isArray(terms) || terms.length > MAX_BLOCKED_TERMS) return null;
    const normalized = terms.map((term) => normalize(term));
    if (!normalized.every((term) => TERM.test(term))) return null;
    return [...new Set(normalized)];
};

export const parseYesNo =(text: unknown): boolean | null => {
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
    installOs: null,
    appVersion: null,
    blockRawIp: null,
    blockedTerms: null,
    learnTopic: null,
    learnCount: 0,
    error: null,
};

// Guards/actions are typed with every event, so they read payloads defensively.
const answerOf = (event: ParamsEvent): string => (event.type === 'ANSWER' ? event.value : '');
const appsOf = (event: ParamsEvent): unknown => (event.type === 'ALLOWED_APPS' ? event.apps : undefined);
const termsOf = (event: ParamsEvent): unknown => (event.type === 'BLOCKED_TERMS' ? event.terms : undefined);

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
        isValidInstallOs: ({ event }) => parseInstallOs(answerOf(event)) !== null,
        isValidAppVersion: ({ event }) => parseAppVersion(answerOf(event)) !== null,
        isValidAppIds: ({ event }) => parseAppIds(appsOf(event)) !== null,
        isValidBlockedTerms: ({ event }) => parseBlockedTermsList(termsOf(event)) !== null,
        isYes: ({ event }) => parseYesNo(answerOf(event)) === true,
        isNo: ({ event }) => parseYesNo(answerOf(event)) === false,
        isProceed: ({ event }) => isProceedAnswer(answerOf(event)),
        isLearnMore: ({ event }) => LEARN_MORE.includes(normalize(answerOf(event))),
        isLearnTopic: ({ event }) => parseLearnTopic(answerOf(event)) !== null,
    },
    actions: {
        saveOs: assign({ os: ({ event }) => parseOs(answerOf(event)), error: null }),
        saveVersion: assign({ version: ({ event }) => parseVersion(answerOf(event)), error: null }),
        saveDns: assign({ privateDns: ({ event }) => parseYesNo(answerOf(event)), privateDnsHost: null, error: null }),
        saveDnsHost: assign({ privateDnsHost: ({ event }) => parseHostname(answerOf(event)), error: null }),
        saveAllowedApps: assign({ allowedApps: ({ event }) => parseAppIds(appsOf(event)), error: null }),
        saveInstallOs: assign({ installOs: ({ event }) => parseInstallOs(answerOf(event)), error: null }),
        saveAppVersion: assign({ appVersion: ({ event }) => parseAppVersion(answerOf(event)), error: null }),
        saveBlockRawIp: assign({ blockRawIp: ({ event }) => parseYesNo(answerOf(event)), error: null }),
        saveBlockedTerms: assign({ blockedTerms: ({ event }) => parseBlockedTermsList(termsOf(event)), error: null }),
        saveNoBlockedTerms: assign({ blockedTerms: () => [], error: null }),
        openLearnMore: assign({ learnTopic: null, error: null }),
        explainTopic: assign({
            learnTopic: ({ event }) => parseLearnTopic(answerOf(event)),
            learnCount: ({ context }) => context.learnCount + 1,
            error: null,
        }),
        clearError: assign({ error: null }),
        reset: assign(() => ({ ...initialContext })),
        rejectOs: assign({ error: 'errors.os' }),
        rejectVersion: assign({ error: 'errors.version' }),
        rejectHostname: assign({ error: 'errors.hostname' }),
        rejectInstallOs: assign({ error: 'errors.installOs' }),
        rejectAppVersion: assign({ error: 'errors.appVersion' }),
        rejectYesNo: assign({ error: 'errors.yesNo' }),
        rejectProceed: assign({ error: 'errors.proceed' }),
        rejectLearnMore: assign({ error: 'errors.learnMore' }),
        rejectAppIds: assign({ error: 'errors.appIds' }),
        rejectBlockedTerms: assign({ error: 'errors.blockedTerms' }),
        rejectTypedTerms: assign({ error: 'errors.typedTerms' }),
        // The list comes from the web app's checklist, not from typed text.
        rejectTypedApps: assign({ error: 'errors.typedApps' }),
    },
}).createMachine({
    id: 'mobileParams',
    context: { ...initialContext },
    initial: 'askStart',
    on: {
        RESTART: { target: '.askStart', actions: 'reset' },
    },
    states: {
        askStart: {
            on: {
                ANSWER: [
                    { guard: 'isProceed', target: 'intro', actions: 'clearError' },
                    { guard: 'isLearnMore', target: 'learnMore', actions: 'openLearnMore' },
                    { actions: 'rejectProceed' },
                ],
            },
        },
        // Explains the concepts behind the setup, one per pick, as many times as
        // the user wants, until they start the setup.
        learnMore: {
            on: {
                ANSWER: [
                    { guard: 'isLearnTopic', actions: 'explainTopic' },
                    { guard: 'isProceed', target: 'intro', actions: 'clearError' },
                    { actions: 'rejectLearnMore' },
                ],
            },
        },
        // What the setup needs and how it goes, before the questions.
        intro: {
            on: {
                ANSWER: [
                    { guard: 'isProceed', target: 'askOs', actions: 'clearError' },
                    { actions: 'rejectProceed' },
                ],
            },
        },
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
                    { guard: 'isValidAppIds', target: 'askBlockRawIp', actions: 'saveAllowedApps' },
                    { actions: 'rejectAppIds' },
                ],
                ANSWER: { actions: 'rejectTypedApps' },
            },
        },
        askBlockRawIp: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'askBlockTerms', actions: 'saveBlockRawIp' },
                    { guard: 'isNo', target: 'askBlockTerms', actions: 'saveBlockRawIp' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        // Yes opens the web modal (collectBlockedTerms); no means no words.
        askBlockTerms: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'collectBlockedTerms', actions: 'clearError' },
                    { guard: 'isNo', target: 'askInstallOs', actions: 'saveNoBlockedTerms' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        // The words come from the web modal's tag input, not typed text.
        collectBlockedTerms: {
            on: {
                BLOCKED_TERMS: [
                    { guard: 'isValidBlockedTerms', target: 'askInstallOs', actions: 'saveBlockedTerms' },
                    { actions: 'rejectBlockedTerms' },
                ],
                ANSWER: { actions: 'rejectTypedTerms' },
            },
        },
        askInstallOs: {
            on: {
                ANSWER: [
                    { guard: 'isValidInstallOs', target: 'askAppVersion', actions: 'saveInstallOs' },
                    { actions: 'rejectInstallOs' },
                ],
            },
        },
        askAppVersion: {
            on: {
                ANSWER: [
                    { guard: 'isValidAppVersion', target: 'confirm', actions: 'saveAppVersion' },
                    { actions: 'rejectAppVersion' },
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
        privateDns: context.privateDns,
        privateDnsHost: context.privateDnsHost,
        allowedApps: context.allowedApps,
        installOs: context.installOs,
        appVersion: context.appVersion,
        blockRawIp: context.blockRawIp,
        blockedTerms: context.blockedTerms,
    }),
});

export type PromptState =
    | 'askStart'
    | 'learnMore'
    | 'intro'
    | 'askOs'
    | 'askVersion'
    | 'askDns'
    | 'askDnsHost'
    | 'askAllowedApps'
    | 'askBlockRawIp'
    | 'askBlockTerms'
    | 'collectBlockedTerms'
    | 'askInstallOs'
    | 'askAppVersion'
    | 'confirm';
