import { CallState, IUser, Message } from '@repo/shared-types';
import type { OnlineUsersStoreInstance, MeetingStoreInstance, ChatStoreInstance } from '../../states/stores';
import type { ISseSource, SseSourceFactory } from './init-call-events';
import { mytoast } from '../../components/toast';
import i18n from '../../i18n.ts';
import properties from '../../properties';

type RealtimeEventMessage =
    | { event: 'online_users_broadcast'; data: Record<string, never> }
    | { event: 'user_logouted'; data: { user: IUser } }
    | { event: 'user_disconnecting'; data: { id: string; call?: CallState } }
    | { event: 'user_disconnected'; data: { id: string; call?: CallState } }
    | { event: 'user_tokens_updated'; data: { id: string; tokens?: number } }
    | { event: 'chat_message_received'; data: { message: Message } }
    | { event: 'meeting_ended'; data: { call: CallState } };

interface InitRealtimeEventsStores {
    onlineUsers: OnlineUsersStoreInstance;
    meeting: MeetingStoreInstance;
    chat: ChatStoreInstance;
}

const createSseSource: SseSourceFactory = (url) => new EventSource(url) as unknown as ISseSource;

const warnIfPartOfMyCall = (user: IUser): void => {
    try {
        mytoast.warn(i18n.t('call.participantLoggedOut', { name: `${user.firstName} ${user.lastName}` }));
    } catch (error) {
        console.error(error);
    }
};

// Realtime's own counterpart to init-call-events.ts — a second, independent
// EventSource for everything realtime pushes that isn't the call/incomingCall
// domain (session/presence/chat). The websocket (see services/ws/init-ws.ts)
// now carries only heartbeat traffic; this is where its old server-push
// events (online_users_broadcast, user_logouted, user_disconnecting/
// disconnected, user_tokens_updated, chat_message_received, meeting_ended)
// arrive instead.
export class InitRealtimeEvents {
    private source: ISseSource | null = null;

    init(token: string | undefined, stores: InitRealtimeEventsStores, factory: SseSourceFactory = createSseSource): void {
        if (!token) return;
        this.source?.close();

        // realtimeWsUrl is a ws(s):// URL (used for the actual websocket
        // connection) — swap the scheme for the HTTP-facing SSE request,
        // and strip any trailing slash the same way init-call-events.ts
        // normalizes IAM's backendUrl.
        const base = properties.realtimeWsUrl.replace(/^ws/, 'http').replace(/\/+$/, '');
        const url = `${base}/realtime-events/stream?token=${encodeURIComponent(token)}`;
        const source = factory(url);
        this.source = source;

        source.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string) as RealtimeEventMessage;
                this.handle(msg, stores);
            } catch {
                // malformed message — ignore
            }
        };
    }

    close(): void {
        this.source?.close();
        this.source = null;
    }

    private handle(msg: RealtimeEventMessage, stores: InitRealtimeEventsStores): void {
        switch (msg.event) {
            case 'online_users_broadcast':
                stores.onlineUsers.getState().refreshUsers();
                break;
            case 'user_logouted':
                warnIfPartOfMyCall(msg.data.user);
                break;
            case 'user_disconnecting':
                // no web-side handler today — same as before this moved off
                // the websocket, nothing consumes this event yet.
                break;
            case 'user_disconnected':
                stores.meeting.getState().userDisconnected(msg.data);
                break;
            case 'user_tokens_updated':
                stores.meeting.getState().userTokensUpdated(msg.data);
                break;
            case 'chat_message_received':
                stores.chat.getState().addMessage(msg.data.message);
                break;
            case 'meeting_ended':
                stores.meeting.getState().meetingEnded(msg.data.call);
                break;
        }
    }
}

export const initRealtimeEvents = new InitRealtimeEvents();
