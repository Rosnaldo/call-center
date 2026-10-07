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
