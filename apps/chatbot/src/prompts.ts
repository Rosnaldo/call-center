import type { ParamsContext, ParamsOutput, PromptState } from './params-machine';

// The bot doesn't send text: it sends i18n keys (under `chatbot.`, in the web
// app's locales) with their params, and each client translates them.
export interface BotText {
    key: string;
    params?: Record<string, unknown>;
}

// The collected params, as shown in the confirm/done messages (`summary` param).
// The allowed apps aren't shown.
export type Summary = Pick<ParamsContext, 'os' | 'version' | 'privateDnsHost' | 'installOs' | 'appVersion'>;

export const summaryOf = ({ os, version, privateDnsHost, installOs, appVersion }: Summary): Summary => ({
    os,
    version,
    privateDnsHost,
    installOs,
    appVersion,
});

// One message per step, or several in order.
export const prompts: Record<PromptState, (ctx: ParamsContext) => BotText | BotText[]> = {
    askStart: () => ({ key: 'messages.askStart' }),
    // The menu, then each picked concept followed by the menu's options again.
    learnMore: (ctx) =>
        ctx.learnTopic ? [{ key: `learn.${ctx.learnTopic}` }, { key: 'messages.learnMoreNext' }] : { key: 'messages.learnMore' },
    intro: () => ({ key: 'messages.intro' }),
    // The kept configuration goes along, for the client's summary button; the
    // yes/no buttons go under the question.
    askReuse: (ctx) => [{ key: 'messages.askReuse', params: { saved: ctx.saved } }, { key: 'messages.askReuseQuestion' }],
    askOs: () => ({ key: 'messages.askOs' }),
    askVersion: (ctx) => ({ key: 'messages.askVersion', params: { os: ctx.os, example: ctx.os === 'iOS' ? '17.4' : '14' } }),
    askDns: () => ({ key: 'messages.askDns' }),
    askDnsHost: () => ({ key: 'messages.askDnsHost' }),
    askAllowedApps: () => ({ key: 'messages.askAllowedApps' }),
    askInstallOs: () => ({ key: 'messages.askInstallOs' }),
    askAppVersion: () => ({ key: 'messages.askAppVersion' }),
    askBlockRawIp: () => ({ key: 'messages.askBlockRawIp' }),
    askBlockTerms: () => ({ key: 'messages.askBlockTerms' }),
    collectBlockedTerms: () => ({ key: 'messages.collectBlockedTerms' }),
    // The web app shows the summary behind a button on the first message; the
    // yes/no buttons go under the question.
    confirm: (ctx) => [{ key: 'messages.confirm', params: { summary: summaryOf(ctx) } }, { key: 'messages.confirmQuestion' }],
};

// Fixed help for a question asked at each setup step (read by the LLM as a
// question, not an answer), before the step is asked again. Steps with a
// "learn more" topic reuse its text.
export const help: Partial<Record<PromptState, BotText[]>> = {
    askOs: [{ key: 'help.askOs' }],
    askVersion: [{ key: 'help.askVersion' }],
    askDns: [{ key: 'learn.privateDns' }, { key: 'help.askDns' }],
    askDnsHost: [{ key: 'help.askDnsHost' }],
    askAllowedApps: [{ key: 'help.askAllowedApps' }],
    askBlockRawIp: [{ key: 'learn.rawIp' }, { key: 'help.askBlockRawIp' }],
    askBlockTerms: [{ key: 'learn.browserGuard' }],
    collectBlockedTerms: [{ key: 'learn.browserGuard' }],
    askInstallOs: [{ key: 'help.askInstallOs' }],
    askAppVersion: [{ key: 'help.askAppVersion' }],
    confirm: [{ key: 'help.confirm' }],
};

// The params read from free text, as shown in the `messages.noted` message
// (`noted` param): the ones it changed, in the questions' order. A hostname
// stands for "private DNS: yes".
export type Noted = Partial<Omit<ParamsOutput, 'allowedApps'>>;
const NOTED_FIELDS = ['os', 'version', 'privateDns', 'privateDnsHost', 'blockRawIp', 'blockedTerms', 'installOs', 'appVersion'] as const;

export const notedOf = (before: ParamsOutput, after: ParamsOutput): Noted | null => {
    const noted: Record<string, unknown> = {};
    for (const field of NOTED_FIELDS) {
        const value = after[field];
        if (value !== null && JSON.stringify(value) !== JSON.stringify(before[field])) noted[field] = value;
    }
    if (noted.privateDnsHost) delete noted.privateDns;
    return Object.keys(noted).length ? (noted as Noted) : null;
};
