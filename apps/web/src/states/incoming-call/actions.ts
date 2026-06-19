import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore } from '../online-users/store.ts';
import { notifyWsIncomingCall } from '@/src/services/online-users-ws.ts';

export interface IncomingCallActions {
  cancel: () => void;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => void;
  setIncomingCall: (incomingCall: IncomingCallState) => void;
  clearIncomingCall: () => void;
}

export const createIncomingCallActions = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void
): IncomingCallActions => ({
  cancel: () => set({ incomingCall: null }),
  sendIncomingCall: (customerId, attendantId) => {
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

      return { incomingCall: incoming };
    });
  },
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
});
