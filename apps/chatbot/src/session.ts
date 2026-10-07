import { createActor, type Actor } from 'xstate';
import { paramsMachine, type PromptState } from './params-machine';
import { prompts, summary } from './prompts';

// What the bot sends back: a chat message, or a request for the allowed apps
// list, which the client picks in its checklist (answered with selectAllowedApps).
export type BotReply = { event: 'bot_message'; message: string } | { event: 'open_allowed_apps' };

const say = (message: string): BotReply => ({ event: 'bot_message', message });
const OPEN_ALLOWED_APPS: BotReply = { event: 'open_allowed_apps' };

// One conversation with the params machine. Transport-agnostic: callers feed
// user input in and get the bot replies back, so the same logic serves the
// websocket server and could serve any other channel.
export class ChatSession {
    private actor!: Actor<typeof paramsMachine>;
    private lastState: PromptState | null = null;

    // Opening replies for a fresh conversation.
    start(): BotReply[] {
        this.actor?.stop();
        this.actor = createActor(paramsMachine).start();
        this.lastState = null;
        return this.replies();
    }

    handle(text: string): BotReply[] {
        const answer = text.trim();
        if (answer === '/restart') return this.start();
        if (this.isDone()) return [say('Type /restart to start over.')];

        this.actor.send({ type: 'ANSWER', value: answer });
        return this.replies();
    }

    // The list picked in the client's checklist.
    selectAllowedApps(apps: unknown): BotReply[] {
        if (this.isDone()) return [say('Type /restart to start over.')];
        if (!this.isPickingAllowedApps()) {
            return [say('There is no app list to choose right now.')];
        }

        this.actor.send({ type: 'ALLOWED_APPS', apps });
        return this.replies();
    }

    // Whether the client's checklist is answering the bot right now.
    isPickingAllowedApps(): boolean {
        return !this.isDone() && this.actor.getSnapshot().value === 'askAllowedApps';
    }

    stop(): void {
        this.actor?.stop();
    }

    // The final state stops the actor, so it can no longer take events.
    private isDone(): boolean {
        return this.actor.getSnapshot().status === 'done';
    }

    private replies(): BotReply[] {
        const snapshot = this.actor.getSnapshot();
        if (snapshot.status === 'done' && snapshot.output) {
            return [say(`Thanks! Collected params:\n${summary(snapshot.output)}`)];
        }

        const state = snapshot.value as PromptState;
        const replies: BotReply[] = [];
        const entered = state !== this.lastState;
        if (snapshot.context.error) {
            replies.push(say(snapshot.context.error));
        } else if (entered) {
            replies.push(say(prompts[state](snapshot.context)));
        }
        // Ask again after an error too, so the button moves to the newest bot message.
        if (state === 'askAllowedApps' && (entered || snapshot.context.error)) replies.push(OPEN_ALLOWED_APPS);
        this.lastState = state;
        return replies;
    }
}
