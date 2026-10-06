import type { ParamsContext, ParamsOutput, PromptState } from './params-machine';

export const summary = ({ os, version, privateVpn }: ParamsOutput): string =>
    `  OS: ${os}\n  Version: ${version}\n  Private VPN: ${privateVpn ? 'yes' : 'no'}`;

export const prompts: Record<PromptState, (ctx: ParamsContext) => string> = {
    askOs: () => 'Which mobile operating system do you use?\n  1) Android\n  2) iOS',
    askVersion: (ctx) => `Which ${ctx.os} version? (e.g. ${ctx.os === 'iOS' ? '17.4' : '14'})`,
    askVpn: () => 'Are you using a private VPN? (yes/no)',
    confirm: (ctx) => `Please confirm:\n${summary(ctx)}\nIs this correct? (yes/no)`,
};
