import { describe, expect, it, vi } from 'vitest';
import { ChatSession } from './session';

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
            { event: 'bot_message', key: 'errors.typedApps' },
            { event: 'open_allowed_apps' },
        ]);
    });

    it('moves on to the USB install OS once picked', () => {
        const { session } = atAllowedApps();
        const [reply] = session.selectAllowedApps(['com.whatsapp']);
        expect(reply).toEqual({ event: 'bot_message', key: 'messages.askInstallOs' });
    });

    it('ignores a list outside the allowed apps step', () => {
        const session = new ChatSession();
        session.start();
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', key: 'messages.noAppList' },
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
            { event: 'bot_message', key: 'messages.askStart' },
            { event: 'ask_choice', choices: [{ key: 'choices.proceed', value: 'proceed' }] },
        ]);
    });

    it('explains the setup before the questions', () => {
        const session = new ChatSession();
        session.start();
        expect(session.handle('proceed')).toEqual([
            { event: 'bot_message', key: 'messages.intro' },
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
            { event: 'bot_message', key: 'errors.yesNo' },
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

    it('shows them on the confirmation', () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
        const replies = session.handle('linux');
        expect(replies).toEqual([
            {
                event: 'bot_message',
                key: 'messages.confirm',
                params: {
                    summary: { os: 'Android', version: '14', privateDnsHost: null, allowedApps: ['com.whatsapp'], installOs: 'Linux' },
                },
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

describe('ChatSession installer', () => {
    const finishedWith = (createInstaller = vi.fn(async () => 'http://dl.test/executables/1')) => {
        const session = new ChatSession(createInstaller);
        session.start();
        for (const answer of ['proceed', 'proceed', '1', '14', 'yes', 'dns.google']) session.handle(answer);
        session.selectAllowedApps(['com.whatsapp']);
        session.handle('windows');
        session.handle('yes');
        return { session, createInstaller };
    };

    it('creates it with the collected params and sends the download URL', async () => {
        const { session, createInstaller } = finishedWith();
        expect(await session.generateInstaller()).toEqual([
            { event: 'bot_message', key: 'messages.installerReady' },
            { event: 'installer_ready', url: 'http://dl.test/executables/1' },
        ]);
        expect(createInstaller).toHaveBeenCalledWith({
            os: 'Android',
            version: '14',
            privateDns: true,
            privateDnsHost: 'dns.google',
            allowedApps: ['com.whatsapp'],
            installOs: 'Windows',
        });
    });

    it('says so when the service fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { session } = finishedWith(vi.fn(async () => Promise.reject(new Error('down'))));
        expect(await session.generateInstaller()).toEqual([{ event: 'bot_message', key: 'messages.installerFailed' }]);
    });

    it('ignores clicks while one is being created', async () => {
        const { session } = finishedWith();
        const first = session.generateInstaller();
        expect(await session.generateInstaller()).toEqual([]);
        expect(await first).toHaveLength(2);
    });

    it('waits for the conversation to finish', async () => {
        const session = new ChatSession(vi.fn());
        session.start();
        expect(await session.generateInstaller()).toEqual([{ event: 'bot_message', key: 'messages.installerNotReady' }]);
    });
});
