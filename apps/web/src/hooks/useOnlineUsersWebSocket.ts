import { useEffect, useRef } from 'react';
import { IOnlineUser } from '@repo/shared-types';
import { useOnlineUsersStore } from '../states/online-users/store';

const WS_URL = import.meta.env.VITE_DAILYCO_WS_URL as string | undefined;
const RECONNECT_DELAY_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_ACK_TIMEOUT_MS = 10_000;

let activeWs: WebSocket | null = null;

export function notifyWsLogout(): void {
  if (activeWs?.readyState === WebSocket.OPEN) {
    activeWs.send(JSON.stringify({ event: 'user_logout' }));
  }
}

type WsInboundMessage =
  | { event: 'online_users_updated'; data: IOnlineUser }
  | { event: 'heartbeat_ack' }
  | { event: 'user_logout'; data: { id: string } };

export function useOnlineUsersWebSocket(token: string | undefined) {
  const upsertUser = useOnlineUsersStore((s) => s.upsertUser);
  const removeUser = useOnlineUsersStore((s) => s.removeUser);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!token || !WS_URL) return;

    mountedRef.current = true;

    const clearHeartbeat = () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
      heartbeatIntervalRef.current = null;
      ackTimerRef.current = null;
    };

    const connect = () => {
      if (!mountedRef.current) return;

      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current = ws;
      activeWs = ws;

      ws.onopen = () => {
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;

          ws.send(JSON.stringify({ event: 'heartbeat' }));

          ackTimerRef.current = setTimeout(() => {
            // Ack not received in time — connection is dead, force close to trigger reconnect
            ws.close();
          }, HEARTBEAT_ACK_TIMEOUT_MS);
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as WsInboundMessage;
          switch (msg.event) {
            case 'online_users_updated':
              upsertUser(msg.data);
              break;
            case 'heartbeat_ack':
              if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
              ackTimerRef.current = null;
              break;
            case 'user_logout':
              removeUser(msg.data.id);
              break;
          }
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onerror = (err) => console.error('[WS] error', err);

      ws.onclose = () => {
        clearHeartbeat();
        if (!mountedRef.current) return;
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      clearHeartbeat();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      activeWs = null;
    };
  }, [token]);
}
