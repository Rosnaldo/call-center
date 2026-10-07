import { createActor, type Actor } from 'xstate';
import { paramsMachine, type PromptState } from './params-machine';
import { prompts, summary } from './prompts';

// What the bot sends back: a chat message, a request for the allowed apps
// list, which the client picks in its checklist (answered with selectAllowedApps),
// a question with fixed options, which the client answers with buttons (sent
// as typed text, with the option's value),
// or, once finished, an offer to generate again (answered with start).
// A button's text and what it answers.
export type Choice = { label: string; value: string };

export type BotReply =
    | { event: 'bot_message'; message: string }
    | { event: 'open_allowed_apps' }
    | { event: 'ask_choice'; choices: Choice[] }
    | { event: 'offer_restart' };

const say = (message: string): BotReply => ({ event: 'bot_message', message });
const OPEN_ALLOWED_APPS: BotReply = { event: 'open_allowed_apps' };
const askChoice = (...choices: Choice[]): BotReply => ({ event: 'ask_choice', choices });
const ASK_YES_NO = askChoice({ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'não' });
const OFFER_RESTART: BotReply = { event: 'offer_restart' };

// Steps the client answers with buttons instead of typing.
const BUTTONS: Partial<Record<PromptState, BotReply>> = {
    askOs: askChoice({ label: 'Android', value: 'android' }, { label: 'iOS', value: 'ios' }),
    askDns: ASK_YES_NO,
    askAllowedApps: OPEN_ALLOWED_APPS,
    confirm: ASK_YES_NO,
};

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
        if (this.isDone()) return [say('Type /restart to start over.'), OFFER_RESTART];

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
            return [say(`Thanks! Collected params:\n${summary(snapshot.output)}`), OFFER_RESTART];
        }

        const state = snapshot.value as PromptState;
        const replies: BotReply[] = [];
        const entered = state !== this.lastState;
        if (snapshot.context.error) {
            replies.push(say(snapshot.context.error));
        } else if (entered) {
            replies.push(say(prompts[state](snapshot.context)));
        }
        // Ask again after an error too, so the buttons move to the newest bot message.
        const buttons = BUTTONS[state];
        if (buttons && (entered || snapshot.context.error)) replies.push(buttons);
        this.lastState = state;
        return replies;
    }
}
