import { useIncomingCallStore, useCallViewStore, useOnlineUsersStore } from '../stores.ts';
import { CallState } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/online-users.ts';
import {
  simulateAcceptedIncomingCall,
  simulateCompleteCall,
  simulateUpdateCall,
  simulateResetCall,
} from './simulation.ts';

const isSimulation = (import.meta as any).env?.VITE_ENV === 'simulation';

export interface CallActions {
  acceptedIncomingCall: () => void;
  completeCall: () => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  resetSimulation: () => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  dailyService: IDailyService,
): CallActions => {
  return {
    acceptedIncomingCall: () => {
      if (isSimulation) {
        simulateAcceptedIncomingCall(set);
        return;
      }

      const incomingCall = useIncomingCallStore.getState().incomingCall;
      if (!incomingCall) return;

      const { users } = useOnlineUsersStore.getState();
      const customer = users.find(u => u.id === incomingCall.customerId);
      const attendant = users.find(u => u.id === incomingCall.attendantId);
      if (!customer || !attendant) return;

      dailyService.join({
        room: `${customer.slug}--${attendant.slug}`,
        userName: attendant.name,
        userData: { id: attendant.id, role: attendant.role },
      });

      useCallViewStore.getState().setViewState('in-call');
    },

    completeCall: () => {
      if (isSimulation) {
        simulateCompleteCall(set);
        return;
      }

      useCallViewStore.getState().setViewState('none');
      useCallViewStore.getState().setSelectedAttendantId(null);
    },

    updateCall: (callId, updates) => {
      if (isSimulation) {
        simulateUpdateCall(set, callId, updates);
        return;
      }
    },

    updateJoinedView: async (call: CallState) => {
      try {
        const callId = call.id;
        const [users] = await Promise.all([
          fetchOnlineUsers(),
        ]);
        set((state: any) => ({ call: state.call?.id === callId ? { ...state.call, ...call } : state.call }));
        useOnlineUsersStore.setState({ users });

      } catch (err) {
        console.error('[Call] updateJoinedView failed:', err);
      }
    },

    updateLeftView: async (call: CallState) => {
      try {
        const callId = call.id;
        const [users] = await Promise.all([
          fetchOnlineUsers(),
        ]);
        set((state: any) => ({ call: state.call?.id === callId ? { ...state.call, ...call } : state.call }));
        useOnlineUsersStore.setState({ users });

      } catch (err) {
        console.error('[Call] updateLeftView failed:', err);
      }
    },

    resetSimulation: () => {
      if (isSimulation) {
        simulateResetCall(set);
      }
    },
  };
};
