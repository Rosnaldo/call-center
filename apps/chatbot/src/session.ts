import { createActor, type Actor } from 'xstate';
import { paramsMachine, type ParamsOutput, type PromptState } from './params-machine';
import { prompts, summaryOf, type BotText } from './prompts';
import type { CreateInstaller } from './installer';
import type { IsLoggedIn } from './user-auth';

// A button: its text (i18n key, like a message's) and what it answers.
export type Choice = { key: string; value: string };

// What the bot sends back: a chat message, a request for the allowed apps
// list, which the client picks in its checklist (answered with selectAllowedApps),
// a question with fixed options, which the client answers with buttons (sent
// as typed text, with the option's value),
// once finished, an offer to generate again (answered with start), or the
// download URL of the installer (answered generateInstaller).
// `sendEnabled` on a chat message tells the client whether to enable its send
// button: only when the answer is typed, not buttons/checklist (nor once done).
export type BotReply =
    | ({ event: 'bot_message'; sendEnabled: boolean } & BotText)
    | { event: 'open_allowed_apps' }
    | { event: 'ask_choice'; choices: Choice[] }
    | { event: 'offer_restart' }
    | { event: 'installer_ready'; url: string };

// `sendEnabled` is filled in by ChatSession.withSendState on the way out.
type Reply = BotReply | ({ event: 'bot_message' } & BotText);

const say = (key: string, params?: BotText['params']): Reply =>
    params ? { event: 'bot_message', key, params } : { event: 'bot_message', key };
const OPEN_ALLOWED_APPS: BotReply = { event: 'open_allowed_apps' };
const askChoice = (...choices: Choice[]): BotReply => ({ event: 'ask_choice', choices });
const ASK_YES_NO = askChoice({ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' });
const OFFER_RESTART: BotReply = { event: 'offer_restart' };

// Steps the client answers with buttons instead of typing.
const BUTTONS: Partial<Record<PromptState, BotReply>> = {
    askStart: askChoice({ key: 'choices.proceed', value: 'proceed' }),
    intro: askChoice({ key: 'choices.proceed', value: 'proceed' }),
    askOs: askChoice({ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }),
    askDns: ASK_YES_NO,
    askAllowedApps: OPEN_ALLOWED_APPS,
    askInstallOs: askChoice(
        { key: 'choices.linux', value: 'linux' },
        { key: 'choices.windows', value: 'windows' },
        { key: 'choices.mac', value: 'mac' },
    ),
    confirm: ASK_YES_NO,
};

// One conversation with the params machine. Transport-agnostic: callers feed
// user input in and get the bot replies back, so the same logic serves the
// websocket server and could serve any other channel.
export class ChatSession {
    private actor!: Actor<typeof paramsMachine>;
    private lastState: PromptState | null = null;
    private isGeneratingInstaller = false;

    // Without `isLoggedIn` (the terminal CLI) anyone may generate the installer.
    constructor(
        private readonly createInstaller?: CreateInstaller,
        private readonly isLoggedIn?: IsLoggedIn,
    ) {}

    // Opening replies for a fresh conversation.
    start(): BotReply[] {
        this.actor?.stop();
        this.actor = createActor(paramsMachine).start();
        this.lastState = null;
        return this.withSendState(this.replies());
    }

    handle(text: string): BotReply[] {
        const answer = text.trim();
        if (answer === '/restart') return this.start();
        if (this.isDone()) return this.withSendState([say('messages.finished'), OFFER_RESTART]);

        this.actor.send({ type: 'ANSWER', value: answer });
        return this.withSendState(this.replies());
    }

    // The list picked in the client's checklist.
    selectAllowedApps(apps: unknown): BotReply[] {
        if (this.isDone()) return this.withSendState([say('messages.finished'), OFFER_RESTART]);
        if (!this.isPickingAllowedApps()) {
            return this.withSendState([say('messages.noAppList')]);
        }

        this.actor.send({ type: 'ALLOWED_APPS', apps });
        return this.withSendState(this.replies());
    }

    // The installer for the collected params, once the conversation is done
    // and only for a logged-in user (`token` is their access token).
    // Repeated clicks while one is being created are ignored.
    async generateInstaller(token?: string): Promise<BotReply[]> {
        return this.withSendState(await this.installerReplies(token));
    }

    private async installerReplies(token?: string): Promise<Reply[]> {
        const snapshot = this.actor.getSnapshot();
        if (snapshot.value !== 'done' || !snapshot.output) return [say('messages.installerNotReady')];
        if (!this.createInstaller) return [say('messages.installerFailed')];
        if (this.isGeneratingInstaller) return [];

        this.isGeneratingInstaller = true;
        try {
            if (this.isLoggedIn && !(await this.isLoggedIn(token))) return [say('messages.loginRequired')];
            const url = await this.createInstaller(snapshot.output);
            return [say('messages.installerReady'), { event: 'installer_ready', url }];
        } catch (err) {
            console.error('[installer]', err);
            return [say('messages.installerFailed')];
        } finally {
            this.isGeneratingInstaller = false;
        }
    }

    // The params collected so far (null until answered), for the client's summary.
    params(): ParamsOutput {
        const { os, version, privateDns, privateDnsHost, allowedApps, installOs } = this.actor.getSnapshot().context;
        return { os, version, privateDns, privateDnsHost, allowedApps, installOs };
    }

    // Whether the client's checklist is answering the bot right now.
    isPickingAllowedApps(): boolean {
        return !this.isDone() && this.actor.getSnapshot().value === 'askAllowedApps';
    }

    stop(): void {
        this.actor?.stop();
    }

    // Typing is only for the steps without buttons, while not finished.
    private isSendEnabled(): boolean {
        if (this.isDone()) return false;
        return !BUTTONS[this.actor.getSnapshot().value as PromptState];
    }

    private withSendState(replies: Reply[]): BotReply[] {
        const sendEnabled = this.isSendEnabled();
        return replies.map((r) => (r.event === 'bot_message' ? { ...r, sendEnabled } : r));
    }

    // The final state stops the actor, so it can no longer take events.
    private isDone(): boolean {
        return this.actor.getSnapshot().status === 'done';
    }

    private replies(): Reply[] {
        const snapshot = this.actor.getSnapshot();
        if (snapshot.status === 'done' && snapshot.output) {
            return [say('messages.done', { summary: summaryOf(snapshot.output) }), OFFER_RESTART];
        }

        const state = snapshot.value as PromptState;
        const replies: Reply[] = [];
        const entered = state !== this.lastState;
        if (snapshot.context.error) {
            replies.push(say(snapshot.context.error));
        } else if (entered) {
            const { key, params } = prompts[state](snapshot.context);
            replies.push(say(key, params));
        }
        // Ask again after an error too, so the buttons move to the newest bot message.
        const buttons = BUTTONS[state];
        if (buttons && (entered || snapshot.context.error)) replies.push(buttons);
        this.lastState = state;
        return replies;
    }
}
