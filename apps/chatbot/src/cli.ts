import readline from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { ChatSession, type BotReply } from './session';
import type { BotText, Summary } from './prompts';
import { createInstallerClient } from './installer';
import { serviceTokenFromEnv } from './service-token';

// The bot sends i18n keys; the texts live in the web app's locales.
const LOCALE_FILE = path.resolve(__dirname, '../../web/src/locales/en.json');
const texts: Record<string, unknown> = JSON.parse(readFileSync(LOCALE_FILE, 'utf8')).chatbot;

// Minimal i18next: nested key lookup and {{param}} interpolation.
const t = (key: string, params: Record<string, unknown> = {}): string => {
    const text = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], texts);
    if (typeof text !== 'string') return key;
    return text.replace(/{{(\w+)}}/g, (_, name: string) => String(params[name] ?? ''));
};

// Same lines as the web app's formatSummary (services/ws/chatbot-ws.ts).
const formatSummary = ({ os, version, privateDnsHost, allowedApps, installOs }: Summary): string =>
    [
        [t('summary.os'), os],
        [t('summary.version'), version],
        [t('summary.privateDns'), privateDnsHost ?? t('summary.no')],
        [t('summary.allowedApps'), allowedApps?.length ? allowedApps.join(', ') : t('summary.none')],
        [t('summary.installOs'), installOs],
    ]
        .map(([label, value]) => `  ${label}: ${value}`)
        .join('\n');

const render = ({ key, params }: BotText): string => {
    const summary = params?.summary as Summary | undefined;
    return t(key, summary ? { ...params, summary: formatSummary(summary) } : params);
};

// Terminal front-end for the bot, handy for trying the flow without the web app.
async function main(): Promise<void> {
    const rl = readline.createInterface({ input, output });
    rl.on('SIGINT', () => {
        console.log('\nBye!');
        process.exit(0);
    });

    const session = new ChatSession(createInstallerClient(
        process.env.EXECUTABLE_URL ?? 'http://127.0.0.1:5005',
        serviceTokenFromEnv(),
    ));
    // The terminal has no checklist, so the app list is typed as comma-separated ids.
    let pickingApps = false;
    const print = (replies: BotReply[]) =>
        replies.forEach((reply) => {
            if (reply.event === 'bot_message') {
                console.log(`Bot: ${render(reply)}`);
                return;
            }
            if (reply.event === 'ask_choice') {
                console.log(`[options] ${reply.choices.map((c) => `${t(c.key)} (${c.value})`).join(' / ')}`);
                return;
            }
            if (reply.event === 'installer_ready') {
                console.log(`[installer] ${reply.url}`);
                return;
            }
            if (reply.event === 'offer_restart') {
                console.log('[done] Type /installer to generate the installer or /restart to generate again.');
                return;
            }
            pickingApps = true;
            console.log('[checklist] Type the allowed app ids separated by commas (empty for none).');
        });

    console.log('Mobile params bot. Type /restart to start over or /exit to quit.\n');
    print(session.start());

    while (true) {
        let answer: string;
        try {
            answer = (await rl.question('You: ')).trim();
        } catch {
            break; // stdin closed (Ctrl+D)
        }
        if (answer === '/exit') break;
        if (answer === '/installer') {
            print(await session.generateInstaller());
            continue;
        }
        if (pickingApps && !answer.startsWith('/')) {
            pickingApps = false;
            print(session.selectAllowedApps(answer.split(/[\s,]+/).filter(Boolean)));
            continue;
        }
        pickingApps = false;
        print(session.handle(answer));
    }

    rl.close();
    session.stop();
    console.log('Bye!');
}

main();
