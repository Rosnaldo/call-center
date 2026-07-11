// Everything this used to dispatch (online_users_broadcast, user_logouted,
// user_disconnected, user_tokens_updated) moved to the realtime-events SSE
// stream — see services/sse/init-realtime-events.ts. This class now only
// carries the websocket's one remaining job: app-level heartbeat/ack.
export type WsUsersMessage =
    | { event: 'heartbeat_ack' };

export class WsUsersService {
    private heartbeatRef: ReturnType<typeof setInterval> | null = null;
    private ackRef: ReturnType<typeof setTimeout> | null = null;

    startHeartbeat(sendHeartbeat: () => void, onTimeout: () => void, intervalMs: number, ackTimeoutMs: number): void {
        if (this.heartbeatRef) return;
        this.heartbeatRef = setInterval(() => {
            sendHeartbeat();
            this.armAck(onTimeout, ackTimeoutMs);
        }, intervalMs);
    }

    stopHeartbeat(): void {
        if (this.heartbeatRef) clearInterval(this.heartbeatRef);
        this.heartbeatRef = null;
        this.cancelAck();
    }

    private armAck(onTimeout: () => void, ackTimeoutMs: number): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = setTimeout(onTimeout, ackTimeoutMs);
    }

    private cancelAck(): void {
        if (this.ackRef) clearTimeout(this.ackRef);
        this.ackRef = null;
    }

    handle(msg: { event: string; data?: any }): boolean {
        switch (msg.event) {
            case 'heartbeat_ack':
                this.cancelAck();
                return true;
            default:
                return false;
        }
    }
}
