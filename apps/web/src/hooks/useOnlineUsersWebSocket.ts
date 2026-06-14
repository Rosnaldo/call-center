import { useEffect, useRef } from 'react';
import { IOnlineUser } from '@repo/shared-types';
import { useOnlineUsersStore } from '../states/online-users/store';

const WS_URL = import.meta.env.VITE_DAILYCO_WS_URL as string | undefined;

interface WsMessage {
  event: string;
  data: IOnlineUser;
}

export function useOnlineUsersWebSocket(token: string | undefined) {
  const upsertUser = useOnlineUsersStore((s) => s.upsertUser);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token || !WS_URL) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const { event: name, data } = JSON.parse(event.data as string) as WsMessage;
        if (name === 'online_users_updated') {
          upsertUser(data);
        }
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onerror = (err) => console.error('[WS] error', err);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);
}
