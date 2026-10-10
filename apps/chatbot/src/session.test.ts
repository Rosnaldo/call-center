import { describe, expect, it, vi } from 'vitest';
import { ChatSession } from './session';
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

    it('moves on to the USB install OS once picked', () => {
        const { session } = atAllowedApps();
        const [reply] = session.selectAllowedApps(['com.whatsapp']);
        expect(reply).toEqual({ event: 'bot_message', key: 'messages.askInstallOs', sendEnabled: false });
    });

    it('ignores a list outside the allowed apps step', () => {
        const session = new ChatSession();
        session.start();
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', key: 'messages.noAppList', sendEnabled: false },
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

    it('opens with a single proceed button', () => {
        const replies = new ChatSession().start();
        expect(replies).toEqual([
            { event: 'bot_message', key: 'messages.askStart', sendEnabled: false },
            { event: 'ask_choice', choices: [{ key: 'choices.proceed', value: 'proceed' }] },
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

    it('offers the USB install OS options', () => {
        const { session } = atAllowedApps();
        expect(session.selectAllowedApps(['com.whatsapp'])[1]).toEqual({
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
            YES_NO,
        ]);
    });
});

describe('ChatSession finish', () => {
    const finished = () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
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

    it('keeps them once finished and clears them on restart', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps([]);
        session.handle('mac');
        session.handle('2.0');
        session.handle('yes');
        expect(session.params()).toMatchObject({ installOs: 'macOS', appVersion: '2.0' });
        session.start();
        expect(session.params()).toEqual(empty);
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
        session.selectAllowedApps(['com.whatsapp']);
        // The configuration version is typed.
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
