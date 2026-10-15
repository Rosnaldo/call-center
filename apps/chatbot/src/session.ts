import { createActor, type Actor } from 'xstate';
import { isProceedAnswer, paramsMachine, type ParamsOutput, type PromptState } from './params-machine';
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
    | { event: 'open_blocked_terms' }
    | { event: 'ask_choice'; choices: Choice[] }
    | { event: 'offer_restart' }
    | { event: 'installer_ready'; url: string };

// `sendEnabled` is filled in by ChatSession.withSendState on the way out.
type Reply = BotReply | ({ event: 'bot_message' } & BotText);

const say = (key: string, params?: BotText['params']): Reply =>
    params ? { event: 'bot_message', key, params } : { event: 'bot_message', key };
const OPEN_ALLOWED_APPS: BotReply = { event: 'open_allowed_apps' };
const OPEN_BLOCKED_TERMS: BotReply = { event: 'open_blocked_terms' };
const askChoice = (...choices: Choice[]): BotReply => ({ event: 'ask_choice', choices });
const ASK_YES_NO = askChoice({ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' });
const OFFER_RESTART: BotReply = { event: 'offer_restart' };

// The configuration version offered as a button; any other is typed.
export const DEFAULT_APP_VERSION = '1.0.0';

// Steps the client answers with buttons instead of typing (unless in TYPED_TOO).
const BUTTONS: Partial<Record<PromptState, BotReply>> = {
    askStart: askChoice({ key: 'choices.proceed', value: 'proceed' }, { key: 'choices.learnMore', value: 'learn' }),
    learnMore: askChoice(
        { key: 'choices.learnPrivateDns', value: 'privateDns' },
        { key: 'choices.learnDeviceOwner', value: 'deviceOwner' },
        { key: 'choices.learnBrowserGuard', value: 'browserGuard' },
        { key: 'choices.learnRawIp', value: 'rawIp' },
        { key: 'choices.learnSchedule', value: 'schedule' },
        { key: 'choices.learnUsbDebugging', value: 'usbDebugging' },
        { key: 'choices.startSetup', value: 'proceed' },
    ),
    intro: askChoice({ key: 'choices.proceed', value: 'proceed' }),
    askOs: askChoice({ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }),
    askDns: ASK_YES_NO,
    askAllowedApps: OPEN_ALLOWED_APPS,
    askBlockRawIp: ASK_YES_NO,
    askBlockTerms: ASK_YES_NO,
    collectBlockedTerms: OPEN_BLOCKED_TERMS,
    askInstallOs: askChoice(
        { key: 'choices.linux', value: 'linux' },
        { key: 'choices.windows', value: 'windows' },
        { key: 'choices.mac', value: 'mac' },
    ),
    askAppVersion: askChoice({ key: 'choices.defaultAppVersion', value: DEFAULT_APP_VERSION }),
    confirm: ASK_YES_NO,
};

// The opening steps, open to anyone; going on to the setup needs a logged-in user.
const OPENING = new Set<PromptState>(['askStart', 'learnMore']);

// Steps with buttons that can also be answered by typing.
const TYPED_TOO = new Set<PromptState>(['askAppVersion']);

// One conversation with the params machine. Transport-agnostic: callers feed
// user input in and get the bot replies back, so the same logic serves the
// websocket server and could serve any other channel.
export class ChatSession {
    private actor!: Actor<typeof paramsMachine>;
    private lastState: PromptState | null = null;
    // learnCount at the last reply: a new pick in the "learn more" menu stays
    // in the same step but has its own explanation to send.
    private lastLearnCount = 0;
    private isGeneratingInstaller = false;

    // Without `isLoggedIn` (the terminal CLI) anyone may set up and generate the installer.
    constructor(
        private readonly createInstaller?: CreateInstaller,
        private readonly isLoggedIn?: IsLoggedIn,
    ) {}

    // Opening replies for a fresh conversation.
    start(): BotReply[] {
        this.actor?.stop();
        this.actor = createActor(paramsMachine).start();
        this.lastState = null;
        this.lastLearnCount = 0;
        return this.withSendState(this.replies());
    }

    handle(text: string): BotReply[] {
        const answer = text.trim();
        if (answer === '/restart') return this.start();
        if (this.isDone()) return this.withSendState([say('messages.finished'), OFFER_RESTART]);

        this.actor.send({ type: 'ANSWER', value: answer });
        return this.withSendState(this.replies());
    }

    // Like handle, but starting the setup from the opening needs a logged-in
    // user (`token` is their access token); learning more doesn't.
    async answer(text: string, token?: string): Promise<BotReply[]> {
        if (this.isLoggedIn && this.isStartingSetup(text)) {
            try {
                if (!(await this.isLoggedIn(token))) return this.withSendState(this.askAgain('messages.proceedLoginRequired'));
            } catch (err) {
                console.error('[login]', err);
                return this.withSendState(this.askAgain('messages.loginCheckFailed'));
            }
        }
        return this.handle(text);
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

    // The words added in the client's modal.
    selectBlockedTerms(terms: unknown): BotReply[] {
        if (this.isDone()) return this.withSendState([say('messages.finished'), OFFER_RESTART]);
        if (!this.isPickingBlockedTerms()) {
            return this.withSendState([say('messages.noTermList')]);
        }

        this.actor.send({ type: 'BLOCKED_TERMS', terms });
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
        const { os, version, privateDns, privateDnsHost, allowedApps, installOs, appVersion, blockRawIp, blockedTerms } =
            this.actor.getSnapshot().context;
        return { os, version, privateDns, privateDnsHost, allowedApps, installOs, appVersion, blockRawIp, blockedTerms };
    }

    // Whether the client's checklist is answering the bot right now.
    isPickingAllowedApps(): boolean {
        return !this.isDone() && this.actor.getSnapshot().value === 'askAllowedApps';
    }

    // Whether the client's blocked-words modal is answering the bot right now.
    isPickingBlockedTerms(): boolean {
        return !this.isDone() && this.actor.getSnapshot().value === 'collectBlockedTerms';
    }

    stop(): void {
        this.actor?.stop();
    }

    private isStartingSetup(text: string): boolean {
        if (this.isDone()) return false;
        return OPENING.has(this.actor.getSnapshot().value as PromptState) && isProceedAnswer(text);
    }

    // A message, then the current step's buttons again, so they move to it.
    private askAgain(key: string): Reply[] {
        const buttons = BUTTONS[this.actor.getSnapshot().value as PromptState];
        return buttons ? [say(key), buttons] : [say(key)];
    }

    // Typing is for the steps without buttons (or that take both), while not finished.
    private isSendEnabled(): boolean {
        if (this.isDone()) return false;
        const state = this.actor.getSnapshot().value as PromptState;
        return !BUTTONS[state] || TYPED_TOO.has(state);
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
        const { learnCount } = snapshot.context;
        const entered = state !== this.lastState || learnCount !== this.lastLearnCount;
        if (snapshot.context.error) {
            replies.push(say(snapshot.context.error));
        } else if (entered) {
            for (const { key, params } of [prompts[state](snapshot.context)].flat()) replies.push(say(key, params));
        }
        // Ask again after an error too, so the buttons move to the newest bot message.
        const buttons = BUTTONS[state];
        if (buttons && (entered || snapshot.context.error)) replies.push(buttons);
        this.lastState = state;
        this.lastLearnCount = learnCount;
        return replies;
    }
}
