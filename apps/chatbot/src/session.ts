import { createActor, type Actor } from 'xstate';
import { isProceedAnswer, isStepAnswer, paramsMachine, stepOf, type ModalField, type ParamsOutput, type PromptState } from './params-machine';
import { help, notedOf, prompts, summaryOf, type BotText } from './prompts';
import type { ExtractFields, Extraction } from './extractor';
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
    askReuse: ASK_YES_NO,
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

// The step whose question asks for each modal's list.
const MODAL_STEPS: Record<ModalField, PromptState> = { allowedApps: 'askAllowedApps', blockedTerms: 'collectBlockedTerms' };

// The opening steps, open to anyone; going on to the setup needs a logged-in user.
const OPENING = new Set<PromptState>(['askStart', 'learnMore']);

// Steps with buttons that can also be answered by typing.
const TYPED_TOO = new Set<PromptState>(['askAppVersion']);

// Steps where, with an LLM, free text can fill any params (and correct them
// on the confirmation): typing is enabled on all of them.
const FILLING = new Set<PromptState>([
    'askOs',
    'askVersion',
    'askDns',
    'askDnsHost',
    'askAllowedApps',
    'askBlockRawIp',
    'askBlockTerms',
    'collectBlockedTerms',
    'askInstallOs',
    'askAppVersion',
    'confirm',
]);

// One conversation with the params machine. Transport-agnostic: callers feed
// user input in and get the bot replies back, so the same logic serves the
// websocket server and could serve any other channel.
export class ChatSession {
    private actor!: Actor<typeof paramsMachine>;
    private lastState: PromptState | null = null;
    // learnCount at the last reply: a new pick in the "learn more" menu stays
    // in the same step but has its own explanation to send.
    private lastLearnCount = 0;
    // fillCount at the last reply: free text may fill params without changing
    // the step, which is then asked again.
    private lastFillCount = 0;
    private isGeneratingInstaller = false;

    // Without `isLoggedIn` (the terminal CLI) anyone may set up and generate the installer.
    // Without `extractFields` each step only takes its own answer, as typed or clicked.
    constructor(
        private readonly createInstaller?: CreateInstaller,
        private readonly isLoggedIn?: IsLoggedIn,
        private readonly extractFields?: ExtractFields,
    ) {}

    // Opening replies for a fresh conversation.
    start(): BotReply[] {
        this.actor?.stop();
        this.actor = createActor(paramsMachine).start();
        this.lastState = null;
        this.lastLearnCount = 0;
        this.lastFillCount = 0;
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
    // user (`token` is their access token); learning more doesn't. During the
    // setup, text that isn't the step's own answer goes to the LLM, which may
    // fill any params from it.
    async answer(text: string, token?: string): Promise<BotReply[]> {
        if (this.isLoggedIn && this.isStartingSetup(text)) {
            try {
                if (!(await this.isLoggedIn(token))) return this.withSendState(this.askAgain('messages.proceedLoginRequired'));
            } catch (err) {
                console.error('[login]', err);
                return this.withSendState(this.askAgain('messages.loginCheckFailed'));
            }
        }
        if (this.isFilling() && !isStepAnswer(this.step(), text.trim()) && text.trim() !== '/restart') return this.fill(text);
        return this.handle(text);
    }

    // The params the LLM reads from `text`, each validated by the machine,
    // after a message saying what was read; a question gets the step's fixed
    // help, and asking to change a modal's params asks for its list again. When it
    // reads none of these (or fails), the step's own parser answers, as without it.
    private async fill(text: string): Promise<BotReply[]> {
        const actor = this.actor;
        let extraction: Extraction = { intent: 'other', fields: {} };
        try {
            extraction = await this.extractFields!(text, this.step());
        } catch (err) {
            console.error('[extract]', err);
        }
        // Restarted while the model was reading: the text was for the old conversation.
        if (actor !== this.actor) return [];
        if (this.isDone()) return this.handle(text);
        if (extraction.intent === 'question' && help[this.step()]) return this.withSendState(this.helpReplies());
        // The modal's question again, without leaving the step: its list is
        // taken at any step and the setup goes on from where it was.
        if (extraction.intent === 'flow' && extraction.flow) return this.withSendState(this.modalReplies(extraction.flow));
        if (!Object.keys(extraction.fields).length) return this.handle(text);

        const before = this.params();
        this.actor.send({ type: 'FILL', fields: extraction.fields });
        const noted = notedOf(before, this.params());
        return this.withSendState([...(noted ? [say('messages.noted', { noted })] : []), ...this.replies()]);
    }

    // The current step's help, then its question and buttons again.
    private helpReplies(): Reply[] {
        const snapshot = this.actor.getSnapshot();
        const step = this.step();
        const replies: Reply[] = (help[step] ?? []).map(({ key }) => say(key));
        for (const { key, params } of [prompts[step](snapshot.context)].flat()) replies.push(say(key, params));
        const buttons = BUTTONS[step];
        return buttons ? [...replies, buttons] : replies;
    }

    // The question asking for a modal's list, and its button.
    private modalReplies(field: ModalField): Reply[] {
        const step = MODAL_STEPS[field];
        const replies: Reply[] = [prompts[step](this.actor.getSnapshot().context)].flat().map(({ key, params }) => say(key, params));
        const buttons = BUTTONS[step];
        return buttons ? [...replies, buttons] : replies;
    }

    // The configuration the client kept from an earlier conversation, offered
    // for reuse after the intro when it's complete and valid. No reply.
    useSaved(params: unknown): void {
        if (!this.isDone()) this.actor.send({ type: 'LOCALSTORAGE', params });
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

    // Whether the client's checklist can answer the bot now: at its step, or
    // at any setup step free text can ask for it again.
    isPickingAllowedApps(): boolean {
        return !this.isDone() && (this.step() === 'askAllowedApps' || this.isFilling());
    }

    // Whether the client's blocked-words modal can answer the bot now, likewise.
    isPickingBlockedTerms(): boolean {
        return !this.isDone() && (this.step() === 'collectBlockedTerms' || this.isFilling());
    }

    stop(): void {
        this.actor?.stop();
    }

    private isStartingSetup(text: string): boolean {
        if (this.isDone()) return false;
        return OPENING.has(this.step()) && isProceedAnswer(text);
    }

    // A message, then the current step's buttons again, so they move to it.
    private askAgain(key: string): Reply[] {
        const buttons = BUTTONS[this.step()];
        return buttons ? [say(key), buttons] : [say(key)];
    }

    // Typing is for the steps without buttons (or that take both), or any setup
    // step with an LLM to read it, while not finished.
    private isSendEnabled(): boolean {
        if (this.isDone()) return false;
        const state = this.step();
        return !BUTTONS[state] || TYPED_TOO.has(state) || this.isFilling();
    }

    private withSendState(replies: Reply[]): BotReply[] {
        const sendEnabled = this.isSendEnabled();
        return replies.map((r) => (r.event === 'bot_message' ? { ...r, sendEnabled } : r));
    }

    // The final state stops the actor, so it can no longer take events.
    private isDone(): boolean {
        return this.actor.getSnapshot().status === 'done';
    }

    // The current question (only meaningful while not done).
    private step(): PromptState {
        return stepOf(this.actor.getSnapshot()) as PromptState;
    }

    // Whether free text can fill params now: an LLM is set and the setup is on.
    private isFilling(): boolean {
        return !!this.extractFields && !this.isDone() && FILLING.has(this.step());
    }

    private replies(): Reply[] {
        const snapshot = this.actor.getSnapshot();
        if (snapshot.status === 'done' && snapshot.output) {
            return [say('messages.done', { summary: summaryOf(snapshot.output) }), OFFER_RESTART];
        }

        const state = this.step();
        const replies: Reply[] = [];
        const { learnCount, fillCount } = snapshot.context;
        const entered = state !== this.lastState || learnCount !== this.lastLearnCount || fillCount !== this.lastFillCount;
        // A fill can save some fields, reject another and move on: the error, then the new question.
        if (snapshot.context.error) replies.push(say(snapshot.context.error));
        if (entered) {
            for (const { key, params } of [prompts[state](snapshot.context)].flat()) replies.push(say(key, params));
        }
        // Ask again after an error too, so the buttons move to the newest bot message.
        const buttons = BUTTONS[state];
        if (buttons && (entered || snapshot.context.error)) replies.push(buttons);
        this.lastState = state;
        this.lastLearnCount = learnCount;
        this.lastFillCount = fillCount;
        return replies;
    }
}
