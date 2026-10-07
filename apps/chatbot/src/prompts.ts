import type { ParamsContext, ParamsOutput, PromptState } from './params-machine';

export const summary = ({ os, version, privateDns, privateDnsHost, allowedApps }: ParamsOutput): string =>
    `  OS: ${os}\n  Version: ${version}\n  Private DNS: ${privateDns ? privateDnsHost : 'no'}\n` +
    `  Allowed apps: ${allowedApps?.length ? allowedApps.join(', ') : 'none'}`;

export const prompts: Record<PromptState, (ctx: ParamsContext) => string> = {
    askOs: () => 'Which mobile operating system do you use?\n  1) Android\n  2) iOS',
    askVersion: (ctx) => `Which ${ctx.os} version? (e.g. ${ctx.os === 'iOS' ? '17.4' : '14'})`,
    askDns: () => 'Are you using a private DNS? (yes/no)',
    askDnsHost: () => 'What is the private DNS hostname? (e.g. dns.adguard.com)',
    askAllowedApps: () => 'Which apps are allowed? Use the button below to select them.',
    confirm: (ctx) => `Please confirm:\n${summary(ctx)}\nIs this correct? (yes/no)`,
};
