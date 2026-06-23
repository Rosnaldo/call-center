import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore, useCallViewStore } from '../stores.ts';
import type { IDailyService } from '@/src/services/daily.ts';
import { apiBack } from '@/src/api/backend.ts';
import { fetchOnlineUsers } from '@/src/services/online-users.ts';
import {
  simulateSendIncomingCall,
  simulateCancelIncomingCall,
  simulateIncomingCall,
  simulateIncomingCallAsCustomer,
} from './simulation.ts';

const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

export interface IncomingCallActions {
  cancel: () => void;
  cancelIncomingCall: () => void;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => void;
  simulateIncomingCall: (attendantId: string) => void;
  simulateIncomingCallAsCustomer: (customerId: string, attendantId: string) => void;
  incomingCallSent: (incomingCall: IncomingCallState) => void;
  incomingCallReceived: (incomingCall: IncomingCallState) => void;
  incomingCallCancelled: () => void;
  incomingCallAccepted: () => void;
}

export const createIncomingCallActions = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void,
  get: () => IncomingCallStore,
  dailyService: IDailyService,
): IncomingCallActions => ({
  cancel: () => set({ incomingCall: null }),

  cancelIncomingCall: () => {
    if (isSimulation) {
      simulateCancelIncomingCall(set, get);
      return;
    }

    const incomingCall = get().incomingCall;
    if (!incomingCall) return;

    set({ incomingCall: null });
    useCallViewStore.getState().setViewState('none');
    useCallViewStore.getState().setSelectedAttendantId(null);

    apiBack.post('/incoming-calls/cancel', { customerId: incomingCall.customerId, attendantId: incomingCall.attendantId })
      .catch((err) => console.error('[IAM] cancel incoming call failed:', err));
  },

  sendIncomingCall: (customerId, attendantId) => {
    if (isSimulation) {
      simulateSendIncomingCall(set, customerId, attendantId);
      return;
    }

    const { users } = useOnlineUsersStore.getState();
    if (!customerId || !attendantId) return;

    const customer = users.find(u => u.id === customerId);
    const attendant = users.find(u => u.id === attendantId);
    if (!customer || !attendant) return;

    if ((customer.tokens ?? 0) <= 0) return;
    if (attendant.status !== 'idle') return;

    apiBack.post('/incoming-calls/send', { customerId, attendantId, whoIsCalling: 'customer' })
      .catch((err) => console.error('[IAM] send incoming call failed:', err));

    dailyService.join({
      room: `${customer.slug}--${attendant.slug}`,
      userName: customer.name,
      userData: { id: customer.id, role: customer.role },
      startAudioOff: false,
      startVideoOff: false,
    });
  },

  simulateIncomingCall: (attendantId) => {
    if (isSimulation) {
      simulateIncomingCall(set, get, attendantId);
    }
  },

  simulateIncomingCallAsCustomer: (customerId, attendantId) => {
    if (isSimulation) {
      simulateIncomingCallAsCustomer(set, get, customerId, attendantId);
    }
  },
  incomingCallAccepted: async () => {
    set({ incomingCall: null });
    useCallViewStore.getState().setViewState('in-call');
    const users = await fetchOnlineUsers();
    useOnlineUsersStore.setState({ users });
  },
  incomingCallSent: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    useCallViewStore.getState().setViewState('awaiting-answer');
    const users = await fetchOnlineUsers();
    useOnlineUsersStore.setState({ users });
  },
  incomingCallReceived: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    useCallViewStore.getState().setViewState('awaiting-to-answer');
    const users = await fetchOnlineUsers();
    useOnlineUsersStore.setState({ users });
  },
  incomingCallCancelled: async () => {
    set({ incomingCall: null });
    useCallViewStore.getState().setViewState('none');
    const users = await fetchOnlineUsers();
    useOnlineUsersStore.setState({ users });
  },
});
