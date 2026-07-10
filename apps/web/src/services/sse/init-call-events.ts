import { CallState, IncomingCallState } from '@repo/shared-types';
import type { CallStoreInstance, IncomingCallStoreInstance } from '../../states/stores';
import properties from '../../properties';

type CallEventMessage =
    | { event: 'incoming_call_sent'; data: { incomingCall: IncomingCallState } }
    | { event: 'incoming_call_received'; data: { incomingCall: IncomingCallState } }
    | { event: 'incoming_call_cancelled'; data: Record<string, never> }
    | { event: 'call_accepted'; data: { call: CallState } }
    | { event: 'call_completed'; data: { call: CallState } };

interface InitCallEventsStores {
    call: CallStoreInstance;
    incomingCall: IncomingCallStoreInstance;
}

export interface ISseSource {
    onmessage: ((ev: { data: string }) => void) | null;
    close(): void;
}

export type SseSourceFactory = (url: string) => ISseSource;

const createSseSource: SseSourceFactory = (url) => new EventSource(url) as unknown as ISseSource;

// Replaces the old IAM-webhook-to-realtime-to-websocket push for the
// send/cancel/accept/complete call flow: IAM publishes straight to Redis and
// this reads it via Server-Sent Events, no realtime involvement and no
// follow-up fetch — the published payload already carries the full state.
// Unlike InitWs's websocket, this isn't leader-elected: every open tab gets
// its own EventSource and reacts independently. That's fine for state sync,
// but incomingCallAccepted gates its own Daily join behind isLeader so only
// one tab actually joins the meeting.
export class InitCallEvents {
    private source: ISseSource | null = null;

    init(token: string | undefined, stores: InitCallEventsStores, factory: SseSourceFactory = createSseSource): void {
        if (!token) return;
        this.source?.close();

        // backendUrl can carry a trailing slash (e.g. VITE_BACKEND_URL=".../iam/")
        // — apiBack gets this for free from axios's baseURL join, but a plain
        // template string doesn't, so a trailing slash here produced a
        // double slash that 404'd behind nginx's /iam/ proxy_pass.
        const base = properties.backendUrl.replace(/\/+$/, '');
        const url = `${base}/call-events/stream?token=${encodeURIComponent(token)}`;
        const source = factory(url);
        this.source = source;

        source.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string) as CallEventMessage;
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

    private handle(msg: CallEventMessage, stores: InitCallEventsStores): void {
        switch (msg.event) {
            case 'incoming_call_sent':
                stores.incomingCall.getState().incomingCallSent(msg.data.incomingCall);
                break;
            case 'incoming_call_received':
                stores.incomingCall.getState().incomingCallReceived(msg.data.incomingCall);
                break;
            case 'incoming_call_cancelled':
                stores.incomingCall.getState().incomingCallCancelled();
                break;
            case 'call_accepted':
                stores.call.getState().incomingCallAccepted(msg.data.call);
                break;
            case 'call_completed':
                stores.call.getState().callCompleted(msg.data.call);
                break;
        }
    }
}

export const initCallEvents = new InitCallEvents();
