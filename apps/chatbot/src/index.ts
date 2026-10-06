import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createActor } from 'xstate';
import { paramsMachine, type PromptState } from './params-machine';
import { prompts, summary } from './prompts';

async function main(): Promise<void> {
    const rl = readline.createInterface({ input, output });
    rl.on('SIGINT', () => {
        console.log('\nBye!');
        process.exit(0);
    });

    const actor = createActor(paramsMachine).start();
    console.log('Mobile params bot. Type /restart to start over or /exit to quit.\n');

    let lastState: string | null = null;
    while (actor.getSnapshot().status !== 'done') {
        const snapshot = actor.getSnapshot();
        const state = snapshot.value as PromptState;
        if (snapshot.context.error) {
            console.log(`Bot: ${snapshot.context.error}`);
        } else if (state !== lastState) {
            console.log(`Bot: ${prompts[state](snapshot.context)}`);
        }
        lastState = state;

        let answer: string;
        try {
            answer = (await rl.question('You: ')).trim();
        } catch {
            break; // stdin closed (Ctrl+D)
        }

        if (answer === '/exit') break;
        if (answer === '/restart') {
            lastState = null;
            actor.send({ type: 'RESTART' });
            continue;
        }
        actor.send({ type: 'ANSWER', value: answer });
    }

    rl.close();
    const snapshot = actor.getSnapshot();
    if (snapshot.status === 'done' && snapshot.output) {
        console.log(`\nBot: Thanks! Collected params:\n${summary(snapshot.output)}`);
        console.log(JSON.stringify(snapshot.output));
    } else {
        console.log('Bye!');
    }
}

main();
