import { IOnlineUser, IncomingCallState } from '@repo/shared-types';

// Mirrors the behaviour of apps/web/src/states/online-users/* and
// apps/web/src/services/online-users-ws.ts without requiring a browser
// environment or Zustand.

type WsInboundMessage =
    | { event: 'online_users_updated'; data: IOnlineUser }
    | { event: 'heartbeat_ack' }
    | { event: 'user_logout'; data: { id: string } }
    | { event: 'incoming_call'; data: { incomingCall: IncomingCallState } }
    | { event: 'call_cancelled'; data: unknown };

export class WebClientStore {
    private readonly _users = new Map<string, IOnlineUser>();
    private _incomingCall: IncomingCallState | null = null;
    readonly received: string[] = [];

    // Call this for every raw JSON frame that the WebSocket transport delivers.
    processMessage(raw: string): void {
        this.received.push(raw);
        try {
            const msg = JSON.parse(raw) as WsInboundMessage;
            switch (msg.event) {
                case 'online_users_updated':
                    this._users.set(msg.data.id, msg.data);
                    break;
                case 'user_logout':
                    this._users.delete(msg.data.id);
                    break;
                case 'incoming_call':
                    this._incomingCall = msg.data.incomingCall;
                    break;
                case 'call_cancelled':
                    this._incomingCall = null;
                    break;
                case 'heartbeat_ack':
                    break;
            }
        } catch {
            // malformed frame — ignore
        }
    }

    getOnlineUsers(): IOnlineUser[] {
        return Array.from(this._users.values());
    }

    getUserById(id: string): IOnlineUser | undefined {
        return this._users.get(id);
    }

    getIncomingCall(): IncomingCallState | null {
        return this._incomingCall;
    }

    setIncomingCall(incomingCall: IncomingCallState): void {
        this._incomingCall = incomingCall;
    }

    clear(): void {
        this._users.clear();
        this._incomingCall = null;
        this.received.length = 0;
    }
}
