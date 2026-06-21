import type { DailyCall } from '@daily-co/daily-js';
import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore } from '../online-users/store.ts';
import { useCallStore } from '../call/store.ts';
import { onlineUsersWs } from '@/src/services/online-users-ws.ts';
import { useCallViewStore } from '../call-view/store.ts';
import { dailyService } from '@/src/services/daily.ts';
import { playNotificationChime } from '@/src/utils/helpers.ts';

export interface IncomingCallActions {
  cancel: () => void;
  cancelIncomingCall: () => void;
  sendIncomingCall: (daily: DailyCall | null, customerId?: string, attendantId?: string | null) => void;
  simulateIncomingCall: (attendantId: string) => void;
  simulateIncomingCallAsCustomer: (customerId: string, attendantId: string) => void;
  setIncomingCall: (incomingCall: IncomingCallState) => void;
  clearIncomingCall: () => void;
}

export const createIncomingCallActions = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void,
  get: () => IncomingCallStore,
): IncomingCallActions => ({
  cancel: () => set({ incomingCall: null }),
  cancelIncomingCall: () => {
    const incomingCall = get().incomingCall;
    if (!incomingCall) return;

    const { updateUser } = useOnlineUsersStore.getState();
    updateUser(incomingCall.customerId, { status: 'idle' as const });
    set({ incomingCall: null });
    onlineUsersWs.notifyCancelCall(incomingCall.attendantId);
    useCallViewStore.getState().setViewState('none');
    useCallViewStore.getState().setSelectedAttendantId(null);
  },
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
      onlineUsersWs.notifyIncomingCall(attendantId, incoming);
      playNotificationChime();

      if (daily) {
        dailyService.join(daily, attendant.slug);
      }

      useCallViewStore.getState().setViewState('awaiting-answer');
      return { incomingCall: incoming };
    });
  },
  simulateIncomingCall: (attendantId) => {
    const { call } = useCallStore.getState();
    const users = useOnlineUsersStore.getState().users;
    const attendant = users.find(u => u.id === attendantId);
    if (!attendant) return;

    const customer = users.find(u => u.role === 'customer' && (u.tokens ?? 5) > 0 && u.status === 'idle');
    if (!customer) return;

    const existingIncoming = get().incomingCall;
    const isOccupied =
      (call?.attendantId === attendantId &&
        call.status === 'active') ||
      existingIncoming?.attendantId === attendantId;
    if (isOccupied) return;

    useOnlineUsersStore.getState().updateUser(customer.id, { status: 'in-call' as const });
    set({ incomingCall: { customerId: customer.id, attendantId } });
    useCallViewStore.getState().setViewState('lobby');
  },
  simulateIncomingCallAsCustomer: (customerId, attendantId) => {
    const { call } = useCallStore.getState();
    const users = useOnlineUsersStore.getState().users;
    const customer = users.find(u => u.id === customerId);
    const attendant = users.find(u => u.id === attendantId);
    if (!customer || !attendant) return;
    if ((customer.tokens ?? 0) <= 0) return;
    if (attendant.status !== 'idle') return;
    if (get().incomingCall) return;
    if (call?.customerId === customerId) return;

    useOnlineUsersStore.getState().updateUser(customerId, { status: 'in-call' as const });
    set({ incomingCall: { customerId, attendantId } });
  },
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
});
