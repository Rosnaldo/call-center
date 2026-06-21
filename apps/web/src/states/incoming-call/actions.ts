import type { DailyCall } from '@daily-co/daily-js';
import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore } from '../online-users/store.ts';
import { notifyWsIncomingCall } from '@/src/services/online-users-ws.ts';
import { useCallViewStore } from '../call-view/store.ts';
import { dailyService } from '@/src/services/daily.ts';

export interface IncomingCallActions {
  cancel: () => void;
  sendIncomingCall: (daily: DailyCall | null, customerId?: string, attendantId?: string | null) => void;
  setIncomingCall: (incomingCall: IncomingCallState) => void;
  clearIncomingCall: () => void;
}

export const createIncomingCallActions = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void
): IncomingCallActions => ({
  cancel: () => set({ incomingCall: null }),
  sendIncomingCall: (daily, customerId, attendantId) => {
    set(() => {
      const { users } = useOnlineUsersStore.getState();
      if (!customerId || !attendantId) return {};

      const customer = users.find(u => u.id === customerId);
      const attendant = users.find(u => u.id === attendantId);
      if (!customer || !attendant) return {};

      if ((customer.tokens ?? 0) <= 0) return {};

      const attendantIsOccupied =
        attendant.status !== 'idle';

      if (attendantIsOccupied) return {};

      const incoming: IncomingCallState = { customerId, attendantId };
      notifyWsIncomingCall(attendantId, incoming);

      if (daily) {
        dailyService.join(daily, attendant.slug);
      }

      useCallViewStore.getState().setViewState('awaiting-answer');
      return { incomingCall: incoming };
    });
  },
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
});
