import { and, assign, setup, type SnapshotFrom } from 'xstate';

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
    // Whether the user wants blocked words (askBlockTerms); yes opens the modal.
    wantsBlockedTerms: boolean | null;
    // Changes from outside the current step (fills that saved something, a
    // modal's list sent at another step), so the session asks the current step
    // again even when it didn't change.
    fillCount: number;
    // The concept last explained in the "learn more" menu (null: the menu itself),
    // and how many were picked, so picking the same one again explains it again.
    learnTopic: LearnTopic | null;
    learnCount: number;
    // i18n key (under `chatbot.`) of the last answer's error.
    error: string | null;
    // A complete configuration the client kept from an earlier conversation,
    // validated like any answer; offered for reuse after the intro.
    saved: ParamsOutput | null;
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
    // Fields read from free text (by the LLM), in any order; each is validated
    // by the same parser as its step's answer.
    | { type: 'FILL'; fields: FieldValues }
    // The configuration the client kept from an earlier conversation (raw).
    | { type: 'LOCALSTORAGE'; params: unknown }
    // Asking to change a typed param without its new value: back to its question.
    | { type: 'REASK'; step: CollectStep }
    // Back to the opening with the extracted params reset (see resetExtraction).
    | { type: 'RESET' };

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

// The params answered in a modal (checklist, tag input), which free text can't
// fill but can ask to change: the session sends the modal's question again.
export const MODAL_FIELDS = ['allowedApps', 'blockedTerms'] as const;
export type ModalField = (typeof MODAL_FIELDS)[number];

// The typed params free text can ask to change without the new value
// ("quero alterar o dns"): the bot goes back to each one's question.
export const REASK_STEPS = {
    os: 'askOs',
    version: 'askVersion',
    privateDns: 'askDns',
    blockRawIp: 'askBlockRawIp',
    installOs: 'askInstallOs',
    appVersion: 'askAppVersion',
} as const satisfies Record<string, CollectStep>;
export type ReaskField = keyof typeof REASK_STEPS;

// The params free text can ask to change: a modal's, or a typed one's question.
export const FLOW_FIELDS = [...MODAL_FIELDS, ...(Object.keys(REASK_STEPS) as ReaskField[])];
export type FlowField = ModalField | ReaskField;
export const isModalField = (field: FlowField): field is ModalField => (MODAL_FIELDS as readonly string[]).includes(field);

// The params free text can fill (FILL). The allowed apps aren't among them:
// they're Play ids picked in the checklist.
export const FILLABLE_FIELDS = [
    'os',
    'version',
    'privateDns',
    'privateDnsHost',
    'blockRawIp',
    'blockedTerms',
    'installOs',
    'appVersion',
] as const;
export type FillableField = (typeof FILLABLE_FIELDS)[number];
// Raw values, as read from the text; null/undefined means not mentioned.
export type FieldValues = Partial<Record<FillableField, unknown>>;

const parseBoolean = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : parseYesNo(value));

// Each field's parser, turned into the context it saves (null: invalid), and
// the error shown when it's invalid. `context` has the fields saved before it.
const FIELD_RULES: Record<FillableField, { error: string; save: (value: unknown, context: ParamsContext) => Partial<ParamsContext> | null }> = {
    os: { error: 'errors.os', save: (value) => (parseOs(value) ? { os: parseOs(value) } : null) },
    version: { error: 'errors.version', save: (value) => (parseVersion(value) ? { version: parseVersion(value) } : null) },
    // Saying there's a private DNS keeps a hostname already given.
    privateDns: {
        error: 'errors.yesNo',
        save: (value, context) => {
            const privateDns = parseBoolean(value);
            if (privateDns === null) return null;
            return { privateDns, privateDnsHost: privateDns ? context.privateDnsHost : null };
        },
    },
    // A hostname implies there's a private DNS.
    privateDnsHost: {
        error: 'errors.hostname',
        save: (value) => (parseHostname(value) ? { privateDns: true, privateDnsHost: parseHostname(value) } : null),
    },
    blockRawIp: {
        error: 'errors.yesNo',
        save: (value) => (parseBoolean(value) === null ? null : { blockRawIp: parseBoolean(value) }),
    },
    // An empty list means no words, like answering no to askBlockTerms.
    blockedTerms: {
        error: 'errors.blockedTerms',
        save: (value) => {
            const blockedTerms = parseBlockedTermsList(value);
            return blockedTerms ? { blockedTerms, wantsBlockedTerms: blockedTerms.length > 0 } : null;
        },
    },
    installOs: { error: 'errors.installOs', save: (value) => (parseInstallOs(value) ? { installOs: parseInstallOs(value) } : null) },
    appVersion: { error: 'errors.appVersion', save: (value) => (parseAppVersion(value) ? { appVersion: parseAppVersion(value) } : null) },
};

// The context after a FILL: every valid field saved, and the error of the
// first invalid one (an invalid field never replaces a saved value).
export const applyFields = (context: ParamsContext, fields: FieldValues): Partial<ParamsContext> => {
    let saved: Partial<ParamsContext> = {};
    let error: string | null = null;
    for (const field of FILLABLE_FIELDS) {
        const value = fields[field];
        if (value === undefined || value === null) continue;
        const patch = FIELD_RULES[field].save(value, { ...context, ...saved });
        if (patch) saved = { ...saved, ...patch };
        else error ??= FIELD_RULES[field].error;
    }
    const changed = Object.keys(saved).length > 0;
    return { ...saved, error, fillCount: changed ? context.fillCount + 1 : context.fillCount };
};

// The setup's questions, in the order they're asked.
export type CollectStep =
    | 'askOs'
    | 'askVersion'
    | 'askDns'
    | 'askDnsHost'
    | 'askAllowedApps'
    | 'askBlockRawIp'
    | 'askBlockTerms'
    | 'collectBlockedTerms'
    | 'askInstallOs'
    | 'askAppVersion';

// The first question still unanswered (null: all answered, on to confirm).
// Questions are skipped once answered, even from text typed at another step.
export const nextStep = (context: ParamsContext): CollectStep | null => {
    if (context.os === null) return 'askOs';
    if (context.version === null) return 'askVersion';
    if (context.privateDns === null) return 'askDns';
    if (context.privateDns && context.privateDnsHost === null) return 'askDnsHost';
    if (context.allowedApps === null) return 'askAllowedApps';
    if (context.blockRawIp === null) return 'askBlockRawIp';
    if (context.wantsBlockedTerms === null) return 'askBlockTerms';
    if (context.blockedTerms === null) return 'collectBlockedTerms';
    if (context.installOs === null) return 'askInstallOs';
    if (context.appVersion === null) return 'askAppVersion';
    return null;
};

// The client's kept configuration, through the same parsers as the answers;
// null unless it's a complete, valid one.
export const savedOf = (params: unknown): ParamsOutput | null => {
    if (!params || typeof params !== 'object') return null;
    const raw = params as Record<string, unknown>;
    const fields: FieldValues = Object.fromEntries(FILLABLE_FIELDS.map((field) => [field, raw[field]]));
    const context: ParamsContext = { ...initialContext, ...applyFields(initialContext, fields), allowedApps: parseAppIds(raw.allowedApps) };
    if (context.error || nextStep(context) !== null) return null;
    const { os, version, privateDns, privateDnsHost, allowedApps, installOs, appVersion, blockRawIp, blockedTerms } = context;
    return { os, version, privateDns, privateDnsHost, allowedApps, installOs, appVersion, blockRawIp, blockedTerms };
};

const COLLECT_STEPS: CollectStep[] = [
    'askOs',
    'askVersion',
    'askDns',
    'askDnsHost',
    'askAllowedApps',
    'askBlockRawIp',
    'askBlockTerms',
    'collectBlockedTerms',
    'askInstallOs',
    'askAppVersion',
];

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
    wantsBlockedTerms: null,
    fillCount: 0,
    learnTopic: null,
    learnCount: 0,
    error: null,
    saved: null,
};

// The context with every extracted param reset, except the lists picked in
// the modals (allowed apps, blocked words), which aren't asked again. Used
// when the summary is rejected and on RESET (the "reset" button).
export const resetExtraction = (context: ParamsContext): ParamsContext => ({
    ...initialContext,
    allowedApps: context.allowedApps,
    blockedTerms: context.blockedTerms,
    wantsBlockedTerms: context.blockedTerms === null ? null : context.wantsBlockedTerms,
});

// Guards/actions are typed with every event, so they read payloads defensively.
const answerOf = (event: ParamsEvent): string => (event.type === 'ANSWER' ? event.value : '');
const appsOf = (event: ParamsEvent): unknown => (event.type === 'ALLOWED_APPS' ? event.apps : undefined);
const termsOf = (event: ParamsEvent): unknown => (event.type === 'BLOCKED_TERMS' ? event.terms : undefined);
const fieldsOf = (event: ParamsEvent): FieldValues => (event.type === 'FILL' ? event.fields : {});
const savedParamsOf = (event: ParamsEvent): unknown => (event.type === 'LOCALSTORAGE' ? event.params : undefined);

// To each question asked again (REASK), keeping the params answered: its
// answer goes on to the first unanswered one, or to confirm.
const REASK = COLLECT_STEPS.map((step) => ({
    guard: ({ event }: { event: ParamsEvent }) => event.type === 'REASK' && event.step === step,
    target: `#mobileParams.collecting.${step}`,
    actions: 'reask' as const,
}));

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
        hasSaved: ({ context }) => context.saved !== null,
    },
    actions: {
        saveOs: assign({ os: ({ event }) => parseOs(answerOf(event)), error: null }),
        saveVersion: assign({ version: ({ event }) => parseVersion(answerOf(event)), error: null }),
        saveDns: assign({ privateDns: ({ event }) => parseYesNo(answerOf(event)), privateDnsHost: null, error: null }),
        saveDnsHost: assign({ privateDnsHost: ({ event }) => parseHostname(answerOf(event)), error: null }),
        saveAllowedApps: assign({
            allowedApps: ({ event }) => parseAppIds(appsOf(event)),
            fillCount: ({ context }) => context.fillCount + 1,
            error: null,
        }),
        saveInstallOs: assign({ installOs: ({ event }) => parseInstallOs(answerOf(event)), error: null }),
        saveAppVersion: assign({ appVersion: ({ event }) => parseAppVersion(answerOf(event)), error: null }),
        saveBlockRawIp: assign({ blockRawIp: ({ event }) => parseYesNo(answerOf(event)), error: null }),
        saveBlockedTerms: assign(({ context, event }) => {
            const blockedTerms = parseBlockedTermsList(termsOf(event));
            return { blockedTerms, wantsBlockedTerms: !!blockedTerms?.length, fillCount: context.fillCount + 1, error: null };
        }),
        wantBlockedTerms: assign({ wantsBlockedTerms: true, error: null }),
        saveNoBlockedTerms: assign({ wantsBlockedTerms: false, blockedTerms: () => [], error: null }),
        fill: assign(({ context, event }) => applyFields(context, fieldsOf(event))),
        // Counted as a fill, so the question is sent even when already at it.
        reask: assign({ fillCount: ({ context }) => context.fillCount + 1, error: null }),
        openLearnMore: assign({ learnTopic: null, error: null }),
        explainTopic: assign({
            learnTopic: ({ event }) => parseLearnTopic(answerOf(event)),
            learnCount: ({ context }) => context.learnCount + 1,
            error: null,
        }),
        clearError: assign({ error: null }),
        storeSaved: assign({ saved: ({ event }) => savedOf(savedParamsOf(event)) }),
        // Every param from the kept configuration, as if answered.
        reuseSaved: assign(({ context }) => ({
            ...context.saved!,
            wantsBlockedTerms: context.saved!.blockedTerms!.length > 0,
            error: null,
        })),
        resetExtraction: assign(({ context }) => resetExtraction(context)),
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
        RESET: { target: '.askStart', actions: 'resetExtraction' },
        // Used only when the intro is done; the client sends it on connecting.
        LOCALSTORAGE: { actions: 'storeSaved' },
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
                    { guard: and(['isProceed', 'hasSaved']), target: 'askReuse', actions: 'clearError' },
                    { guard: 'isProceed', target: 'collecting', actions: 'clearError' },
                    { actions: 'rejectProceed' },
                ],
            },
        },
        // A configuration kept from an earlier conversation: yes fills every
        // param from it and finishes (it was confirmed when kept), so the
        // installer can be generated right away; no asks them all.
        askReuse: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'done', actions: 'reuseSaved' },
                    { guard: 'isNo', target: 'collecting', actions: 'clearError' },
                    { actions: 'rejectYesNo' },
                ],
            },
        },
        // Slot filling: each question takes its own answer (typed or a button),
        // and FILL and the modals' lists are taken at any step. After either,
        // `route` goes to the first unanswered question, or to confirm once all
        // are answered.
        collecting: {
            initial: 'route',
            on: {
                FILL: { target: '.route', actions: 'fill' },
                REASK,
                ALLOWED_APPS: [
                    { guard: 'isValidAppIds', target: '.route', actions: 'saveAllowedApps' },
                    { actions: 'rejectAppIds' },
                ],
                BLOCKED_TERMS: [
                    { guard: 'isValidBlockedTerms', target: '.route', actions: 'saveBlockedTerms' },
                    { actions: 'rejectBlockedTerms' },
                ],
            },
            states: {
                route: {
                    always: [
                        ...COLLECT_STEPS.map((step) => ({ guard: ({ context }: { context: ParamsContext }) => nextStep(context) === step, target: step })),
                        { target: '#mobileParams.confirm' },
                    ],
                },
                askOs: {
                    on: {
                        ANSWER: [
                            { guard: 'isValidOs', target: 'route', actions: 'saveOs' },
                            { actions: 'rejectOs' },
                        ],
                    },
                },
                askVersion: {
                    on: {
                        ANSWER: [
                            { guard: 'isValidVersion', target: 'route', actions: 'saveVersion' },
                            { actions: 'rejectVersion' },
                        ],
                    },
                },
                askDns: {
                    on: {
                        ANSWER: [
                            { guard: 'isYes', target: 'route', actions: 'saveDns' },
                            { guard: 'isNo', target: 'route', actions: 'saveDns' },
                            { actions: 'rejectYesNo' },
                        ],
                    },
                },
                askDnsHost: {
                    on: {
                        ANSWER: [
                            { guard: 'isValidHostname', target: 'route', actions: 'saveDnsHost' },
                            { actions: 'rejectHostname' },
                        ],
                    },
                },
                // The list comes from the web checklist (ALLOWED_APPS), not typed text.
                askAllowedApps: {
                    on: {
                        ANSWER: { actions: 'rejectTypedApps' },
                    },
                },
                askBlockRawIp: {
                    on: {
                        ANSWER: [
                            { guard: 'isYes', target: 'route', actions: 'saveBlockRawIp' },
                            { guard: 'isNo', target: 'route', actions: 'saveBlockRawIp' },
                            { actions: 'rejectYesNo' },
                        ],
                    },
                },
                // Yes opens the web modal (collectBlockedTerms); no means no words.
                askBlockTerms: {
                    on: {
                        ANSWER: [
                            { guard: 'isYes', target: 'route', actions: 'wantBlockedTerms' },
                            { guard: 'isNo', target: 'route', actions: 'saveNoBlockedTerms' },
                            { actions: 'rejectYesNo' },
                        ],
                    },
                },
                // The words come from the web modal's tag input (BLOCKED_TERMS), not typed text.
                collectBlockedTerms: {
                    on: {
                        ANSWER: { actions: 'rejectTypedTerms' },
                    },
                },
                askInstallOs: {
                    on: {
                        ANSWER: [
                            { guard: 'isValidInstallOs', target: 'route', actions: 'saveInstallOs' },
                            { actions: 'rejectInstallOs' },
                        ],
                    },
                },
                askAppVersion: {
                    on: {
                        ANSWER: [
                            { guard: 'isValidAppVersion', target: 'route', actions: 'saveAppVersion' },
                            { actions: 'rejectAppVersion' },
                        ],
                    },
                },
            },
        },
        // Free text here corrects fields (FILL), and a modal's list its param;
        // either shows the summary again.
        confirm: {
            on: {
                ANSWER: [
                    { guard: 'isYes', target: 'done', actions: 'clearError' },
                    { guard: 'isNo', target: 'collecting', actions: 'resetExtraction' },
                    { actions: 'rejectYesNo' },
                ],
                FILL: { target: 'collecting', actions: 'fill' },
                REASK,
                ALLOWED_APPS: [
                    { guard: 'isValidAppIds', target: 'collecting', actions: 'saveAllowedApps' },
                    { actions: 'rejectAppIds' },
                ],
                BLOCKED_TERMS: [
                    { guard: 'isValidBlockedTerms', target: 'collecting', actions: 'saveBlockedTerms' },
                    { actions: 'rejectBlockedTerms' },
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
    | 'askReuse'
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

// The step a snapshot is at: a question inside `collecting`, or a top state.
export const stepOf = (snapshot: SnapshotFrom<typeof paramsMachine>): PromptState | 'done' => {
    const { value } = snapshot;
    return (typeof value === 'string' ? value : value.collecting) as PromptState | 'done';
};

// Whether `text` is a valid answer to the step's own question, by its parser.
// Steps answered only with the checklist or the modal take no typed answer.
export const isStepAnswer = (step: PromptState, text: string): boolean => {
    switch (step) {
        case 'askStart':
        case 'intro':
            return isProceedAnswer(text) || (step === 'askStart' && LEARN_MORE.includes(normalize(text)));
        case 'learnMore':
            return isProceedAnswer(text) || parseLearnTopic(text) !== null;
        case 'askOs':
            return parseOs(text) !== null;
        case 'askVersion':
            return parseVersion(text) !== null;
        case 'askDnsHost':
            return parseHostname(text) !== null;
        case 'askInstallOs':
            return parseInstallOs(text) !== null;
        case 'askAppVersion':
            return parseAppVersion(text) !== null;
        case 'askReuse':
        case 'askDns':
        case 'askBlockRawIp':
        case 'askBlockTerms':
        case 'confirm':
            return parseYesNo(text) !== null;
        default:
            return false;
    }
};
