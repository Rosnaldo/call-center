import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ChatSession, type BotReply } from './session';

// Terminal front-end for the bot, handy for trying the flow without the web app.
async function main(): Promise<void> {
    const rl = readline.createInterface({ input, output });
    rl.on('SIGINT', () => {
        console.log('\nBye!');
        process.exit(0);
    });

    const session = new ChatSession();
    // The terminal has no checklist, so the app list is typed as comma-separated ids.
    let pickingApps = false;
    const print = (replies: BotReply[]) =>
        replies.forEach((reply) => {
            if (reply.event === 'bot_message') {
                console.log(`Bot: ${reply.message}`);
                return;
            }
            if (reply.event === 'ask_choice') return; // the prompt already lists the options
            if (reply.event === 'offer_restart') {
                console.log('[done] Type /restart to generate again.');
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
