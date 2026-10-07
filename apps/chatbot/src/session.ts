import { createActor, type Actor } from 'xstate';
import { paramsMachine, type PromptState } from './params-machine';
import { prompts, summary } from './prompts';

// One conversation with the params machine. Transport-agnostic: callers feed
// user text in and get the bot replies back, so the same logic serves the
// websocket server and could serve any other channel.
export class ChatSession {
    private actor!: Actor<typeof paramsMachine>;
    private lastState: PromptState | null = null;

    // Opening replies for a fresh conversation.
    start(): string[] {
        this.actor?.stop();
        this.actor = createActor(paramsMachine).start();
        this.lastState = null;
        return this.replies();
    }

    handle(text: string): string[] {
        const answer = text.trim();
        if (answer === '/restart') return this.start();
        // The final state stops the actor, so it can no longer take events.
        if (this.actor.getSnapshot().status === 'done') return ['Type /restart to start over.'];

        this.actor.send({ type: 'ANSWER', value: answer });
        return this.replies();
    }

    stop(): void {
        this.actor?.stop();
    }

    private replies(): string[] {
        const snapshot = this.actor.getSnapshot();
        if (snapshot.status === 'done' && snapshot.output) {
            return [`Thanks! Collected params:\n${summary(snapshot.output)}`];
        }

        const state = snapshot.value as PromptState;
        const replies: string[] = [];
        if (snapshot.context.error) {
            replies.push(snapshot.context.error);
        } else if (state !== this.lastState) {
            replies.push(prompts[state](snapshot.context));
        }
        this.lastState = state;
        return replies;
    }
}
