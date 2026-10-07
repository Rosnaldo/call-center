import type { ParamsContext, ParamsOutput, PromptState } from './params-machine';

export const summary = ({ os, version, privateVpn, allowedApps }: ParamsOutput): string =>
    `  OS: ${os}\n  Version: ${version}\n  Private VPN: ${privateVpn ? 'yes' : 'no'}\n` +
    `  Allowed apps: ${allowedApps?.length ? allowedApps.join(', ') : 'none'}`;

export const prompts: Record<PromptState, (ctx: ParamsContext) => string> = {
    askOs: () => 'Which mobile operating system do you use?\n  1) Android\n  2) iOS',
    askVersion: (ctx) => `Which ${ctx.os} version? (e.g. ${ctx.os === 'iOS' ? '17.4' : '14'})`,
    askVpn: () => 'Are you using a private VPN? (yes/no)',
    askAllowedApps: () => 'Which apps are allowed? Use the button below to select them.',
    confirm: (ctx) => `Please confirm:\n${summary(ctx)}\nIs this correct? (yes/no)`,
};
