import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ChatSession } from './session';

// Terminal front-end for the bot, handy for trying the flow without the web app.
async function main(): Promise<void> {
    const rl = readline.createInterface({ input, output });
    rl.on('SIGINT', () => {
        console.log('\nBye!');
        process.exit(0);
    });

    const session = new ChatSession();
    const print = (replies: string[]) => replies.forEach((reply) => console.log(`Bot: ${reply}`));

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
        print(session.handle(answer));
    }

    rl.close();
    session.stop();
    console.log('Bye!');
}

main();
