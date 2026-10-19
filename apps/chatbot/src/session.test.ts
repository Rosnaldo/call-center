import { describe, expect, it, vi } from 'vitest';
import { ChatSession } from './session';
import type { ExtractFields, Extraction } from './extractor';
import type { IsLoggedIn } from './user-auth';

const atAllowedApps = () => {
    const session = new ChatSession();
    session.start();
    session.handle('proceed');
    session.handle('proceed');
    session.handle('1');
    session.handle('14');
    return { session, replies: session.handle('no') };
};

describe('ChatSession allowed apps', () => {
    it('asks the client to open the checklist', () => {
        const { replies } = atAllowedApps();
        expect(replies.map((r) => r.event)).toEqual(['bot_message', 'open_allowed_apps']);
    });

    it('rejects typed text and reopens the checklist', () => {
        const { session } = atAllowedApps();
        expect(session.handle('com.whatsapp')).toEqual([
            { event: 'bot_message', key: 'errors.typedApps', sendEnabled: false },
            { event: 'open_allowed_apps' },
        ]);
    });

    it('asks about raw IPs once the apps are picked', () => {
        const { session } = atAllowedApps();
        const [reply] = session.selectAllowedApps(['com.whatsapp']);
        expect(reply).toEqual({ event: 'bot_message', key: 'messages.askBlockRawIp', sendEnabled: false });
    });

    it('ignores a list outside the allowed apps step', () => {
        const session = new ChatSession();
        session.start();
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', key: 'messages.noAppList', sendEnabled: false },
        ]);
    });

    it('ignores blocked words outside their modal step', () => {
        const session = new ChatSession();
        session.start();
        expect(session.selectBlockedTerms(['semi'])).toEqual([
            { event: 'bot_message', key: 'messages.noTermList', sendEnabled: false },
        ]);
    });
});

describe('ChatSession choice buttons', () => {
    const atDns = () => {
        const session = new ChatSession();
        session.start();
        session.handle('proceed');
        session.handle('proceed');
        session.handle('1');
        return { session, replies: session.handle('14') };
    };

    const YES_NO = { event: 'ask_choice', choices: [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }] };

    it('opens with proceed and learn more buttons', () => {
        const replies = new ChatSession().start();
        expect(replies).toEqual([
            { event: 'bot_message', key: 'messages.askStart', sendEnabled: false },
            {
                event: 'ask_choice',
                choices: [
                    { key: 'choices.proceed', value: 'proceed' },
                    { key: 'choices.learnMore', value: 'learn' },
                ],
            },
        ]);
    });

    it('explains the setup before the questions', () => {
        const session = new ChatSession();
        session.start();
        expect(session.handle('proceed')).toEqual([
            { event: 'bot_message', key: 'messages.intro', sendEnabled: false },
            { event: 'ask_choice', choices: [{ key: 'choices.proceed', value: 'proceed' }] },
        ]);
    });

    it('offers the OS options', () => {
        const session = new ChatSession();
        session.start();
        session.handle('proceed');
        const replies = session.handle('proceed');
        expect(replies[1]).toEqual({
            event: 'ask_choice',
            choices: [{ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }],
        });
    });

    it('offers yes/no', () => {
        const { replies } = atDns();
        expect(replies[1]).toEqual(YES_NO);
    });

    it('shows them again after an invalid answer', () => {
        const { session } = atDns();
        expect(session.handle('maybe')).toEqual([
            { event: 'bot_message', key: 'errors.yesNo', sendEnabled: false },
            YES_NO,
        ]);
    });

    it('asks raw-IP, then whether to add words, and opens the modal on yes', () => {
        const { session } = atAllowedApps();
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', key: 'messages.askBlockRawIp', sendEnabled: false },
            YES_NO,
        ]);
        expect(session.handle('yes')).toEqual([
            { event: 'bot_message', key: 'messages.askBlockTerms', sendEnabled: false },
            YES_NO,
        ]);
        expect(session.params().blockRawIp).toBe(true);
        // Yes opens the modal; the words come back through selectBlockedTerms.
        expect(session.handle('yes')).toEqual([
            { event: 'bot_message', key: 'messages.collectBlockedTerms', sendEnabled: false },
            { event: 'open_blocked_terms' },
        ]);
        session.selectBlockedTerms(['semi', 'bokup']);
        expect(session.params().blockedTerms).toEqual(['semi', 'bokup']);
    });

    it('skips the modal and stores no words when the user declines', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('no'); // raw IP
        const [reply] = session.handle('no'); // don't add words
        expect(reply).toEqual({ event: 'bot_message', key: 'messages.askInstallOs', sendEnabled: false });
        expect(session.params().blockedTerms).toEqual([]);
    });

    it('offers the USB install OS options', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('no');
        expect(session.handle('no')[1]).toEqual({
            event: 'ask_choice',
            choices: [
                { key: 'choices.linux', value: 'linux' },
                { key: 'choices.windows', value: 'windows' },
                { key: 'choices.mac', value: 'mac' },
            ],
        });
    });

    it('offers the default configuration version and still takes a typed one', () => {
        const atVersion = () => {
            const { session } = atAllowedApps();
            session.selectAllowedApps(['com.whatsapp']);
            session.handle('no');
            session.handle('no');
            return { session, replies: session.handle('linux') };
        };

        const { replies } = atVersion();
        expect(replies).toEqual([
            { event: 'bot_message', key: 'messages.askAppVersion', sendEnabled: true },
            { event: 'ask_choice', choices: [{ key: 'choices.defaultAppVersion', value: '1.0.0' }] },
        ]);

        const clicked = atVersion().session;
        clicked.handle('1.0.0');
        expect(clicked.params().appVersion).toBe('1.0.0');

        const typed = atVersion().session;
        typed.handle('2.3');
        expect(typed.params().appVersion).toBe('2.3');
    });

    it('shows them on the confirmation', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('no');
        session.handle('no');
        session.handle('linux');
        const replies = session.handle('1.0');
        expect(replies).toEqual([
            {
                event: 'bot_message',
                key: 'messages.confirm',
                params: {
                    summary: { os: 'Android', version: '14', privateDnsHost: null, installOs: 'Linux', appVersion: '1.0' },
                },
                sendEnabled: false,
            },
            { event: 'bot_message', key: 'messages.confirmQuestion', sendEnabled: false },
            YES_NO,
        ]);
    });
});

describe('ChatSession finish', () => {
    const finished = () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('no');
        session.handle('no');
        session.handle('mac');
        session.handle('1.0');
        return { session, replies: session.handle('yes') };
    };

    it('offers to generate again after the summary', () => {
        const { replies } = finished();
        expect(replies.map((r) => r.event)).toEqual(['bot_message', 'offer_restart']);
    });

    it('keeps offering it while finished', () => {
        const { session } = finished();
        expect(session.handle('hello').map((r) => r.event)).toEqual(['bot_message', 'offer_restart']);
    });

    it('starts a new conversation', () => {
        const { session } = finished();
        const replies = session.start();
        expect(replies.map((r) => r.event)).toEqual(['bot_message', 'ask_choice']);
        expect(session.handle('proceed').map((r) => r.event)).toEqual(['bot_message', 'ask_choice']);
    });
});

describe('ChatSession params', () => {
    const empty = {
        os: null,
        version: null,
        privateDns: null,
        privateDnsHost: null,
        allowedApps: null,
        installOs: null,
        appVersion: null,
        blockRawIp: null,
        blockedTerms: null,
    };

    it('starts empty', () => {
        const session = new ChatSession();
        session.start();
        expect(session.params()).toEqual(empty);
    });

    it('has the answers given so far', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        expect(session.params()).toEqual({ ...empty, os: 'Android', version: '14', privateDns: false, allowedApps: ['com.whatsapp'] });
    });

    it('keeps them once finished and resets them on restart, except the apps and words', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps([]);
        session.handle('no');
        session.handle('no');
        session.handle('mac');
        session.handle('2.0');
        session.handle('yes');
        expect(session.params()).toMatchObject({ installOs: 'macOS', appVersion: '2.0', blockRawIp: false, blockedTerms: [] });
        session.start();
        expect(session.params()).toEqual({ ...empty, allowedApps: [], blockedTerms: [] });
    });
});

describe('ChatSession send state', () => {
    it('enables sending on the steps without buttons', () => {
        const session = new ChatSession();
        session.start();
        session.handle('proceed');
        session.handle('proceed');
        expect(session.handle('android')).toEqual([
            { event: 'bot_message', key: 'messages.askVersion', params: expect.anything(), sendEnabled: true },
        ]);
    });

    it('keeps it enabled after an invalid typed answer', () => {
        const session = new ChatSession();
        session.start();
        session.handle('proceed');
        session.handle('proceed');
        session.handle('android');
        const [reply] = session.handle('abc');
        expect(reply).toMatchObject({ event: 'bot_message', sendEnabled: true });
    });

    it('disables it on button steps and once finished', () => {
        const { replies } = atAllowedApps();
        expect(replies[0]).toMatchObject({ sendEnabled: false });
        const { session } = atAllowedApps();
        // Raw-IP is a button step (disabled); blocked terms and version are typed.
        expect(session.selectAllowedApps(['com.whatsapp'])[0]).toMatchObject({ key: 'messages.askBlockRawIp', sendEnabled: false });
        expect(session.handle('no')[0]).toMatchObject({ key: 'messages.askBlockTerms', sendEnabled: false });
        session.handle('no');
        expect(session.handle('mac')[0]).toMatchObject({ key: 'messages.askAppVersion', sendEnabled: true });
        session.handle('1.0');
        expect(session.handle('yes')[0]).toMatchObject({ sendEnabled: false });
    });
});

describe('ChatSession installer', () => {
    const finishedWith = (
        createInstaller = vi.fn(async () => 'http://dl.test/executables/1'),
        isLoggedIn?: IsLoggedIn,
    ) => {
        const session = new ChatSession(createInstaller, isLoggedIn);
        session.start();
        for (const answer of ['proceed', 'proceed', '1', '14', 'yes', 'dns.google']) session.handle(answer);
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('yes');
        session.handle('yes');
        session.selectBlockedTerms(['semi']);
        session.handle('windows');
        session.handle('1.2.3');
        session.handle('yes');
        return { session, createInstaller };
    };

    it('creates it with the collected params and sends the download URL', async () => {
        const { session, createInstaller } = finishedWith();
        expect(await session.generateInstaller()).toEqual([
            { event: 'bot_message', key: 'messages.installerReady', sendEnabled: false },
            { event: 'installer_ready', url: 'http://dl.test/executables/1' },
        ]);
        expect(createInstaller).toHaveBeenCalledWith({
            os: 'Android',
            version: '14',
            privateDns: true,
            privateDnsHost: 'dns.google',
            allowedApps: ['com.whatsapp'],
            installOs: 'Windows',
            appVersion: '1.2.3',
            blockRawIp: true,
            blockedTerms: ['semi'],
        });
    });

    it('says so when the service fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { session } = finishedWith(vi.fn(async () => Promise.reject(new Error('down'))));
        expect(await session.generateInstaller()).toEqual([{ event: 'bot_message', key: 'messages.installerFailed', sendEnabled: false }]);
    });

    it('ignores clicks while one is being created', async () => {
        const { session } = finishedWith();
        const first = session.generateInstaller();
        expect(await session.generateInstaller()).toEqual([]);
        expect(await first).toHaveLength(2);
    });

    it('asks to log in when the user is not logged in', async () => {
        const { session, createInstaller } = finishedWith(undefined, async (token) => token === 'user-token');
        expect(await session.generateInstaller()).toEqual([
            { event: 'bot_message', key: 'messages.loginRequired', sendEnabled: false },
        ]);
        expect(await session.generateInstaller('expired')).toEqual([
            { event: 'bot_message', key: 'messages.loginRequired', sendEnabled: false },
        ]);
        expect(createInstaller).not.toHaveBeenCalled();
        expect(await session.generateInstaller('user-token')).toHaveLength(2);
        expect(createInstaller).toHaveBeenCalledOnce();
    });

    it('says it failed when the login cannot be checked', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { session } = finishedWith(undefined, async () => Promise.reject(new Error('iam down')));
        expect(await session.generateInstaller('user-token')).toEqual([
            { event: 'bot_message', key: 'messages.installerFailed', sendEnabled: false },
        ]);
    });

    it('waits for the conversation to finish', async () => {
        const session = new ChatSession(vi.fn());
        session.start();
        expect(await session.generateInstaller()).toEqual([{ event: 'bot_message', key: 'messages.installerNotReady', sendEnabled: false }]);
    });
});

describe('ChatSession learn more', () => {
    const MENU = {
        event: 'ask_choice',
        choices: [
            { key: 'choices.learnPrivateDns', value: 'privateDns' },
            { key: 'choices.learnDeviceOwner', value: 'deviceOwner' },
            { key: 'choices.learnBrowserGuard', value: 'browserGuard' },
            { key: 'choices.learnRawIp', value: 'rawIp' },
            { key: 'choices.learnSchedule', value: 'schedule' },
            { key: 'choices.learnUsbDebugging', value: 'usbDebugging' },
            { key: 'choices.startSetup', value: 'proceed' },
        ],
    };
    const atMenu = () => {
        const session = new ChatSession();
        session.start();
        return { session, replies: session.handle('learn') };
    };

    it('opens the topics menu', () => {
        expect(atMenu().replies).toEqual([{ event: 'bot_message', key: 'messages.learnMore', sendEnabled: false }, MENU]);
    });

    it('explains each topic and offers the menu again', () => {
        const { session } = atMenu();
        expect(session.handle('deviceOwner')).toEqual([
            { event: 'bot_message', key: 'learn.deviceOwner', sendEnabled: false },
            { event: 'bot_message', key: 'messages.learnMoreNext', sendEnabled: false },
            MENU,
        ]);
        expect(session.handle('schedule')[0]).toMatchObject({ key: 'learn.schedule' });
    });

    it('explains the same topic again when asked twice', () => {
        const { session } = atMenu();
        session.handle('privateDns');
        expect(session.handle('privateDns')[0]).toMatchObject({ key: 'learn.privateDns' });
    });

    it('rejects anything else and shows the menu again', () => {
        const { session } = atMenu();
        expect(session.handle('what?')).toEqual([{ event: 'bot_message', key: 'errors.learnMore', sendEnabled: false }, MENU]);
    });

    it('starts the setup from the menu, with nothing collected', () => {
        const { session } = atMenu();
        session.handle('usbDebugging');
        expect(session.handle('proceed')[0]).toMatchObject({ key: 'messages.intro' });
        expect(session.handle('proceed')[0]).toMatchObject({ key: 'messages.askOs' });
        expect(session.params().os).toBeNull();
    });
});

describe('ChatSession login to start the setup', () => {
    const START = {
        event: 'ask_choice',
        choices: [
            { key: 'choices.proceed', value: 'proceed' },
            { key: 'choices.learnMore', value: 'learn' },
        ],
    };
    const opened = (isLoggedIn: IsLoggedIn = async (token) => token === 'user-token') => {
        const session = new ChatSession(vi.fn(), isLoggedIn);
        session.start();
        return session;
    };

    it('asks a logged-out user to log in and stays at the opening', async () => {
        const session = opened();
        expect(await session.answer('proceed')).toEqual([
            { event: 'bot_message', key: 'messages.proceedLoginRequired', sendEnabled: false },
            START,
        ]);
        expect(await session.answer('sim', 'expired')).toEqual([
            { event: 'bot_message', key: 'messages.proceedLoginRequired', sendEnabled: false },
            START,
        ]);
    });

    it('lets a logged-out user learn more, but not start from the menu', async () => {
        const session = opened();
        expect((await session.answer('learn'))[0]).toMatchObject({ key: 'messages.learnMore' });
        expect((await session.answer('deviceOwner'))[0]).toMatchObject({ key: 'learn.deviceOwner' });
        const [reply, menu] = await session.answer('proceed');
        expect(reply).toMatchObject({ key: 'messages.proceedLoginRequired' });
        expect(menu).toMatchObject({ event: 'ask_choice' });
    });

    it('starts the setup for a logged-in user', async () => {
        const session = opened();
        expect((await session.answer('proceed', 'user-token'))[0]).toMatchObject({ key: 'messages.intro' });
    });

    it('only checks the login when starting the setup', async () => {
        const isLoggedIn = vi.fn(async () => true);
        const session = opened(isLoggedIn);
        await session.answer('learn');
        await session.answer('rawIp');
        expect(isLoggedIn).not.toHaveBeenCalled();
        await session.answer('proceed', 'user-token');
        await session.answer('proceed');
        expect(isLoggedIn).toHaveBeenCalledOnce();
    });

    it('says it failed when the login cannot be checked', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const session = opened(async () => Promise.reject(new Error('iam down')));
        expect(await session.answer('proceed', 'user-token')).toEqual([
            { event: 'bot_message', key: 'messages.loginCheckFailed', sendEnabled: false },
            START,
        ]);
    });

    it('needs no login without a login check (the CLI)', async () => {
        const session = new ChatSession();
        session.start();
        expect((await session.answer('proceed'))[0]).toMatchObject({ key: 'messages.intro' });
    });
});

describe('ChatSession free text (LLM)', () => {
    const YES_NO = { event: 'ask_choice', choices: [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }] };
    const OS_CHOICES = { event: 'ask_choice', choices: [{ key: 'choices.android', value: 'android' }, { key: 'choices.ios', value: 'ios' }] };
    const answer = (fields: Extraction['fields']): Extraction => ({ intent: 'set', fields });
    const atOs = (extract: ExtractFields) => {
        const session = new ChatSession(undefined, undefined, extract);
        session.start();
        session.handle('proceed');
        session.handle('proceed');
        return session;
    };

    it("answers with the step's own parser without calling the model", async () => {
        const extract = vi.fn(async () => answer({}));
        const session = atOs(extract);
        expect((await session.answer('android'))[0]).toMatchObject({ key: 'messages.askVersion' });
        expect(extract).not.toHaveBeenCalled();
    });

    it('says what it read, fills it and asks the first missing param', async () => {
        const extract = vi.fn(async () => answer({ os: 'iOS', version: '17.4' }));
        const session = atOs(extract);
        expect(await session.answer('tenho um iphone com ios 17.4')).toEqual([
            { event: 'bot_message', key: 'messages.noted', params: { noted: { os: 'iOS', version: '17.4' } }, sendEnabled: true },
            { event: 'bot_message', key: 'messages.askDns', sendEnabled: true },
            YES_NO,
        ]);
        expect(extract).toHaveBeenCalledWith('tenho um iphone com ios 17.4', 'askOs');
        expect(session.params()).toMatchObject({ os: 'iOS', version: '17.4' });
    });

    it('notes only the valid values, then the error, then the next question', async () => {
        const session = atOs(async () => answer({ os: 'Android', version: 'quatorze' }));
        expect(await session.answer('android quatorze')).toEqual([
            { event: 'bot_message', key: 'messages.noted', params: { noted: { os: 'Android' } }, sendEnabled: true },
            { event: 'bot_message', key: 'errors.version', sendEnabled: true },
            { event: 'bot_message', key: 'messages.askVersion', params: { os: 'Android', example: '14' }, sendEnabled: true },
        ]);
    });

    it('notes a private DNS hostname without a separate yes', async () => {
        const session = atOs(async () => answer({ privateDns: true, privateDnsHost: 'dns.google' }));
        const [noted] = await session.answer('uso o dns.google');
        expect(noted).toMatchObject({ params: { noted: { privateDnsHost: 'dns.google' } } });
    });

    it('answers a question with the step help and asks the step again, saving nothing', async () => {
        const session = atOs(async () => ({ intent: 'question', fields: {} }));
        for (const answer of ['android', '14']) session.handle(answer);
        expect(await session.answer('o que é dns privado?')).toEqual([
            { event: 'bot_message', key: 'learn.privateDns', sendEnabled: true },
            { event: 'bot_message', key: 'help.askDns', sendEnabled: true },
            { event: 'bot_message', key: 'messages.askDns', sendEnabled: true },
            YES_NO,
        ]);
        expect(session.params().privateDns).toBeNull();
    });

    it('helps on the confirmation with its summary again', async () => {
        const session = atOs(async () => ({ intent: 'question', fields: {} }));
        for (const answer of ['android', '14', 'no']) session.handle(answer);
        session.selectAllowedApps([]);
        for (const answer of ['no', 'no', 'linux', '1.0']) session.handle(answer);
        const replies = await session.answer('e agora?');
        expect(replies.map((r) => (r.event === 'bot_message' ? r.key : r.event))).toEqual(['help.confirm', 'messages.confirm', 'messages.confirmQuestion', 'ask_choice']);
    });

    it("falls back to the step's error when the model reads nothing or fails", async () => {
        expect(await atOs(async () => ({ intent: 'other', fields: {} })).answer('hello')).toEqual([
            { event: 'bot_message', key: 'errors.os', sendEnabled: true },
            OS_CHOICES,
        ]);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const failed = atOs(async () => Promise.reject(new Error('ollama down')));
        expect((await failed.answer('tenho um iphone'))[0]).toMatchObject({ key: 'errors.os' });
    });

    it('asks the current step again after filling other params', async () => {
        const later = new ChatSession(undefined, undefined, async () => answer({ installOs: 'macOS' }));
        later.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) later.handle(text);
        expect(await later.answer('vou instalar pelo mac')).toEqual([
            { event: 'bot_message', key: 'messages.noted', params: { noted: { installOs: 'macOS' } }, sendEnabled: true },
            { event: 'bot_message', key: 'messages.askAllowedApps', sendEnabled: true },
            { event: 'open_allowed_apps' },
        ]);
        expect(later.params().installOs).toBe('macOS');
    });

    it('enables typing on button steps', async () => {
        const session = atOs(async () => answer({}));
        expect((await session.answer('android'))[0]).toMatchObject({ sendEnabled: true });
        expect((await session.answer('14'))[0]).toMatchObject({ key: 'messages.askDns', sendEnabled: true });
    });

    it('starts the setup from the opening with the params read there', async () => {
        const extract = vi.fn(async () => answer({ os: 'Android' }));
        const session = new ChatSession(undefined, undefined, extract);
        session.start();
        const replies = await session.answer('tenho um android');
        expect(extract).toHaveBeenCalledWith('tenho um android', 'askStart');
        expect(replies.map((r) => ('key' in r ? r.key : r.event))).toEqual(['messages.noted', 'messages.askVersion']);
        expect(session.params().os).toBe('Android');
    });

    it('needs a logged-in user to start the setup from the opening', async () => {
        const isLoggedIn = vi.fn(async () => false);
        const session = new ChatSession(undefined, isLoggedIn, async () => answer({ os: 'Android' }));
        session.start();
        expect((await session.answer('tenho um android', 'tok'))[0]).toMatchObject({ key: 'messages.proceedLoginRequired' });
        expect(isLoggedIn).toHaveBeenCalledWith('tok');
        expect(session.params().os).toBeNull();
    });

    it('keeps the opening for anything else, and its buttons without the LLM', async () => {
        const extract = vi.fn(async (): Promise<Extraction> => ({ intent: 'other', fields: {} }));
        const session = new ChatSession(undefined, undefined, extract);
        session.start();
        expect((await session.answer('oi'))[0]).toMatchObject({ key: 'errors.proceed' });
        expect(extract).toHaveBeenCalledTimes(1);
        expect((await session.answer('learn'))[0]).toMatchObject({ key: 'messages.learnMore' });
        expect((await session.answer('proceed'))[0]).toMatchObject({ key: 'messages.intro' });
        expect(extract).toHaveBeenCalledTimes(1);
    });

    it('drops the replies of a conversation restarted while the model was reading', async () => {
        let resolve!: (extraction: Extraction) => void;
        const session = atOs(() => new Promise((r) => (resolve = r)));
        const pending = session.answer('tenho um iphone');
        session.start();
        resolve(answer({ os: 'iOS' }));
        expect(await pending).toEqual([]);
        expect(session.params().os).toBeNull();
    });
});

describe('ChatSession saved configuration', () => {
    const SAVED = {
        os: 'Android',
        version: '14',
        privateDns: false,
        privateDnsHost: null,
        allowedApps: ['com.whatsapp'],
        installOs: 'Linux',
        appVersion: '1.0.0',
        blockRawIp: false,
        blockedTerms: [],
    };
    const YES_NO = { event: 'ask_choice', choices: [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }] };

    it('asks to reuse it after the intro, sending it for the summary', () => {
        const session = new ChatSession();
        session.start();
        session.useSaved(SAVED);
        session.handle('proceed');
        expect(session.handle('proceed')).toEqual([
            { event: 'bot_message', key: 'messages.askReuse', params: { saved: SAVED }, sendEnabled: false },
            { event: 'bot_message', key: 'messages.askReuseQuestion', sendEnabled: false },
            YES_NO,
        ]);
        // Straight to the installer: the kept configuration was confirmed when kept.
        expect(session.handle('yes').map((r) => (r.event === 'bot_message' ? r.key : r.event))).toEqual([
            'messages.done',
            'offer_restart',
        ]);
        expect(session.params()).toEqual(SAVED);
    });

    it('generates the installer with it', async () => {
        const createInstaller = vi.fn(async () => 'http://dl.test/executables/1');
        const session = new ChatSession(createInstaller);
        session.start();
        session.useSaved(SAVED);
        for (const answer of ['proceed', 'proceed', 'yes']) session.handle(answer);
        expect((await session.generateInstaller()).map((r) => r.event)).toEqual(['bot_message', 'installer_ready']);
        expect(createInstaller).toHaveBeenCalledWith(SAVED);
    });

    it('only offers it when it arrives before the intro is done', () => {
        const session = new ChatSession();
        session.start();
        session.handle('proceed');
        session.handle('proceed');
        session.useSaved(SAVED);
        expect(session.params().os).toBeNull();
    });
});

describe('ChatSession asking for a modal\'s list again (LLM)', () => {
    const flow = (target: 'allowedApps' | 'blockedTerms') => async () => ({ intent: 'flow' as const, fields: {}, flow: target });
    const atConfirm = (session: ChatSession) => {
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) session.handle(text);
        session.selectAllowedApps(['com.whatsapp']);
        for (const text of ['no', 'no', 'linux', '1.0']) session.handle(text);
    };

    it('asks for the apps again without leaving the confirmation, then shows it again', async () => {
        const session = new ChatSession(undefined, undefined, flow('allowedApps'));
        atConfirm(session);

        expect(await session.answer('quero trocar os apps')).toEqual([
            { event: 'bot_message', key: 'messages.askAllowedApps', sendEnabled: true },
            { event: 'open_allowed_apps' },
        ]);
        expect(session.isPickingAllowedApps()).toBe(true);
        expect(session.selectAllowedApps(['com.whatsapp', 'com.Slack'])[0]).toMatchObject({ key: 'messages.confirm' });
        expect(session.params().allowedApps).toEqual(['com.whatsapp', 'com.Slack']);
    });

    it('still confirms with the buttons after asking for the list', async () => {
        const session = new ChatSession(undefined, undefined, flow('allowedApps'));
        atConfirm(session);
        await session.answer('quero trocar os apps');
        expect(session.handle('yes')[0]).toMatchObject({ key: 'messages.done' });
    });

    it('asks for the words again, even after saying no words', async () => {
        const session = new ChatSession(undefined, undefined, flow('blockedTerms'));
        atConfirm(session);
        expect(await session.answer('quero bloquear sites')).toEqual([
            { event: 'bot_message', key: 'messages.collectBlockedTerms', sendEnabled: true },
            { event: 'open_blocked_terms' },
        ]);
        expect(session.selectBlockedTerms(['bet'])[0]).toMatchObject({ key: 'messages.confirm' });
        expect(session.params().blockedTerms).toEqual(['bet']);
    });

    it('asks the current question again once the list is sent at an earlier step', async () => {
        const session = new ChatSession(undefined, undefined, flow('allowedApps'));
        session.start();
        for (const text of ['proceed', 'proceed', 'android']) session.handle(text);
        await session.answer('quero escolher os apps');
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', key: 'messages.askVersion', params: { os: 'Android', example: '14' }, sendEnabled: true },
        ]);
    });

    it('asks for the apps again when already at their question', async () => {
        const session = new ChatSession(undefined, undefined, flow('allowedApps'));
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) session.handle(text);
        expect(await session.answer('quero mudar os apps')).toEqual([
            { event: 'bot_message', key: 'messages.askAllowedApps', sendEnabled: true },
            { event: 'open_allowed_apps' },
        ]);
    });
});


describe('ChatSession asking a typed param\'s question again (LLM)', () => {
    const flow = (target: 'privateDns' | 'version') => async () => ({ intent: 'flow' as const, fields: {}, flow: target });
    const atConfirm = (session: ChatSession) => {
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) session.handle(text);
        session.selectAllowedApps(['com.whatsapp']);
        for (const text of ['no', 'no', 'linux', '1.0']) session.handle(text);
    };

    it('goes back to the private DNS question from the confirmation, then shows it again', async () => {
        const session = new ChatSession(undefined, undefined, flow('privateDns'));
        atConfirm(session);

        expect(await session.answer('quero alterar o dns privado')).toEqual([
            { event: 'bot_message', key: 'messages.askDns', sendEnabled: true },
            { event: 'ask_choice', choices: [{ key: 'choices.yes', value: 'yes' }, { key: 'choices.no', value: 'no' }] },
        ]);
        expect(session.handle('yes')[0]).toMatchObject({ key: 'messages.askDnsHost' });
        expect(session.handle('dns.adguard.com')[0]).toMatchObject({ key: 'messages.confirm' });
        expect(session.params()).toMatchObject({ privateDns: true, privateDnsHost: 'dns.adguard.com', installOs: 'Linux' });
    });

    it('asks the question again when already at it', async () => {
        const session = new ChatSession(undefined, undefined, flow('version'));
        session.start();
        for (const text of ['proceed', 'proceed', 'android']) session.handle(text);
        expect(await session.answer('quero mudar a versão')).toEqual([
            { event: 'bot_message', key: 'messages.askVersion', params: { os: 'Android', example: '14' }, sendEnabled: true },
        ]);
    });
});

describe('ChatSession when the LLM fails', () => {
    it('still goes back to a param the message asks to change', async () => {
        const session = new ChatSession(undefined, undefined, async () => {
            throw new Error('timeout');
        });
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) session.handle(text);
        session.selectAllowedApps(['com.whatsapp']);
        for (const text of ['no', 'no', 'linux', '1.0']) session.handle(text);
        vi.spyOn(console, 'error').mockImplementation(() => {});

        expect((await session.answer('quero alterar o dns privado'))[0]).toMatchObject({ key: 'messages.askDns' });
    });
});

describe('ChatSession changing params once finished (LLM)', () => {
    const finished = (extract: ExtractFields) => {
        const session = new ChatSession(undefined, undefined, extract);
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'no']) session.handle(text);
        session.selectAllowedApps(['com.whatsapp']);
        for (const text of ['no', 'no', 'linux', '1.0', 'yes']) session.handle(text);
        return session;
    };

    it('goes back to the asked question, then to the confirmation', async () => {
        const extract = vi.fn(async (): Promise<Extraction> => ({ intent: 'flow', fields: {}, flow: 'privateDns' }));
        const session = finished(extract);

        expect((await session.answer('quero alterar o dns privado'))[0]).toMatchObject({ key: 'messages.askDns' });
        expect(extract).toHaveBeenCalledWith('quero alterar o dns privado', 'confirm');
        session.handle('yes');
        expect(session.handle('dns.adguard.com')[0]).toMatchObject({ key: 'messages.confirm' });
        expect(session.handle('yes')[0]).toMatchObject({ key: 'messages.done' });
        expect(session.params()).toMatchObject({ privateDnsHost: 'dns.adguard.com', installOs: 'Linux' });
    });

    it('fills a value given, then confirms again', async () => {
        const session = finished(async () => ({ intent: 'set', fields: { installOs: 'Windows' } }));
        const replies = await session.answer('muda o computador para windows');
        expect(replies.map((r) => ('key' in r ? r.key : r.event))).toContain('messages.confirm');
        expect(session.params().installOs).toBe('Windows');
    });

    it('stays finished for anything else', async () => {
        const session = finished(async () => ({ intent: 'other', fields: {} }));
        expect((await session.answer('oi'))[0]).toMatchObject({ key: 'messages.finished' });
    });
});

describe('ChatSession changing the kept configuration offered for reuse (LLM)', () => {
    const KEPT = {
        os: 'Android',
        version: '14',
        privateDns: false,
        privateDnsHost: null,
        allowedApps: ['com.whatsapp'],
        installOs: 'Linux',
        appVersion: '1.0.0',
        blockRawIp: false,
        blockedTerms: [],
    };
    const atReuse = (extract: ExtractFields) => {
        const session = new ChatSession(undefined, undefined, extract);
        session.start();
        session.handle('proceed');
        session.useSaved(KEPT);
        session.handle('proceed');
        return session;
    };

    it('takes it and asks for the apps, then confirms', async () => {
        const extract = vi.fn(async (): Promise<Extraction> => ({ intent: 'flow', fields: {}, flow: 'allowedApps' }));
        const session = atReuse(extract);

        expect(await session.answer('quero alterar apps bloqueados')).toEqual([
            { event: 'bot_message', key: 'messages.askAllowedApps', sendEnabled: true },
            { event: 'open_allowed_apps' },
        ]);
        expect(extract).toHaveBeenCalledWith('quero alterar apps bloqueados', 'confirm');
        expect(session.selectAllowedApps(['com.Slack'])[0]).toMatchObject({ key: 'messages.confirm' });
        expect(session.params()).toMatchObject({ allowedApps: ['com.Slack'], installOs: 'Linux' });
    });

    it('still takes yes and no without the LLM', async () => {
        const extract = vi.fn(async (): Promise<Extraction> => ({ intent: 'other', fields: {} }));
        expect((await atReuse(extract).answer('sim'))[0]).toMatchObject({ key: 'messages.done' });
        expect((await atReuse(extract).answer('não'))[0]).toMatchObject({ key: 'messages.askOs' });
        expect(extract).not.toHaveBeenCalled();
    });

    it('asks again for anything else', async () => {
        const session = atReuse(async () => ({ intent: 'other', fields: {} }));
        expect((await session.answer('oi'))[0]).toMatchObject({ key: 'errors.yesNo' });
    });
});

describe('ChatSession resetting the extracted params', () => {
    const atConfirm = () => {
        const session = new ChatSession();
        session.start();
        for (const text of ['proceed', 'proceed', 'android', '14', 'yes', 'dns.adguard.com']) session.handle(text);
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('no');
        session.handle('yes');
        session.selectBlockedTerms(['bet']);
        for (const text of ['linux', '1.0']) session.handle(text);
        return session;
    };
    const RESET = {
        os: null,
        version: null,
        privateDns: null,
        privateDnsHost: null,
        installOs: null,
        appVersion: null,
        blockRawIp: null,
        allowedApps: ['com.whatsapp'],
        blockedTerms: ['bet'],
    };

    it('keeps only the apps and words when the summary is rejected, without asking them again', () => {
        const session = atConfirm();
        expect(session.handle('no')[0]).toMatchObject({ key: 'messages.askOs' });
        expect(session.params()).toEqual(RESET);

        for (const text of ['ios', '17', 'no', 'no', 'mac']) session.handle(text);
        expect(session.handle('2.0')[0]).toMatchObject({ key: 'messages.confirm' });
    });

    it('keeps only the apps and words on restarting a finished conversation', () => {
        const session = atConfirm();
        session.handle('yes');
        expect(session.start()[0]).toMatchObject({ key: 'messages.askStart' });
        expect(session.params()).toEqual(RESET);
    });

    it('keeps only the apps and words on restarting mid-conversation', () => {
        const session = atConfirm();
        session.start();
        expect(session.params()).toEqual(RESET);
    });
});
