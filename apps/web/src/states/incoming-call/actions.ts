import type { DailyCall } from '@daily-co/daily-js';
import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore, useCallViewStore, useDevicesStore } from '../stores.ts';
import { initWs } from '@/src/services/init-ws.ts';
import { dailyService } from '@/src/services/daily.ts';
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
    if (isSimulation) {
      simulateCancelIncomingCall(set, get);
      return;
    }

    const incomingCall = get().incomingCall;
    if (!incomingCall) return;

    set({ incomingCall: null });
    initWs.notifyCancelCall(incomingCall.attendantId);
    useCallViewStore.getState().setViewState('none');
    useCallViewStore.getState().setSelectedAttendantId(null);
  },

  sendIncomingCall: (daily, customerId, attendantId) => {
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

    const incoming: IncomingCallState = { customerId, attendantId };
    initWs.notifyIncomingCall(attendantId, incoming);

    if (daily) {
      const { cameraOn, microphoneOn } = useDevicesStore.getState();
      dailyService.join(daily, {
        room: `${customer.slug}--${attendant.slug}`,
        userName: customer.name,
        userData: { id: customer.id, role: customer.role },
        startAudioOff: !microphoneOn,
        startVideoOff: !cameraOn,
      });
    }

    useCallViewStore.getState().setViewState('awaiting-answer');
    set({ incomingCall: incoming });
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

  setIncomingCall: (incomingCall) => set({ incomingCall }),
  clearIncomingCall: () => set({ incomingCall: null }),
});
