import { describe, expect, it } from 'vitest';
import { ChatSession } from './session';

const atAllowedApps = () => {
    const session = new ChatSession();
    session.start();
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
            { event: 'bot_message', message: 'Please use the button to select the allowed apps.' },
            { event: 'open_allowed_apps' },
        ]);
    });

    it('moves on to the confirmation with the picked list', () => {
        const { session } = atAllowedApps();
        const [reply] = session.selectAllowedApps(['com.whatsapp']);
        expect(reply).toMatchObject({ event: 'bot_message', message: expect.stringContaining('Allowed apps: com.whatsapp') });
    });

    it('ignores a list outside the allowed apps step', () => {
        const session = new ChatSession();
        session.start();
        expect(session.selectAllowedApps(['com.whatsapp'])).toEqual([
            { event: 'bot_message', message: 'There is no app list to choose right now.' },
        ]);
    });
});

describe('ChatSession choice buttons', () => {
    const atDns = () => {
        const session = new ChatSession();
        session.start();
        session.handle('1');
        return { session, replies: session.handle('14') };
    };

    const YES_NO = { event: 'ask_choice', choices: [{ label: 'Sim', value: 'sim' }, { label: 'Não', value: 'não' }] };

    it('offers the OS options', () => {
        const replies = new ChatSession().start();
        expect(replies[1]).toEqual({
            event: 'ask_choice',
            choices: [{ label: 'Android', value: 'android' }, { label: 'iOS', value: 'ios' }],
        });
    });

    it('offers yes/no', () => {
        const { replies } = atDns();
        expect(replies[1]).toEqual(YES_NO);
    });

    it('shows them again after an invalid answer', () => {
        const { session } = atDns();
        expect(session.handle('maybe')).toEqual([
            { event: 'bot_message', message: 'Please answer yes or no.' },
            YES_NO,
        ]);
    });

    it('shows them on the confirmation', () => {
        const { session } = atAllowedApps();
        expect(session.selectAllowedApps(['com.whatsapp']).map((r) => r.event)).toEqual(['bot_message', 'ask_choice']);
    });
});

describe('ChatSession finish', () => {
    const finished = () => {
        const { session } = atAllowedApps();
        session.selectAllowedApps(['com.whatsapp']);
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
        expect(session.handle('1')).toMatchObject([{ event: 'bot_message' }]);
    });
});
