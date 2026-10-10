import type { ParamsContext, PromptState } from './params-machine';

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

export const prompts: Record<PromptState, (ctx: ParamsContext) => BotText> = {
    askStart: () => ({ key: 'messages.askStart' }),
    intro: () => ({ key: 'messages.intro' }),
    askOs: () => ({ key: 'messages.askOs' }),
    askVersion: (ctx) => ({ key: 'messages.askVersion', params: { os: ctx.os, example: ctx.os === 'iOS' ? '17.4' : '14' } }),
    askDns: () => ({ key: 'messages.askDns' }),
    askDnsHost: () => ({ key: 'messages.askDnsHost' }),
    askAllowedApps: () => ({ key: 'messages.askAllowedApps' }),
    askInstallOs: () => ({ key: 'messages.askInstallOs' }),
    askAppVersion: () => ({ key: 'messages.askAppVersion' }),
    confirm: (ctx) => ({ key: 'messages.confirm', params: { summary: summaryOf(ctx) } }),
};
