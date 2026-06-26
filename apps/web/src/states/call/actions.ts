import { useIncomingCallStore, useCallViewStore, useOnlineUsersStore } from '../stores.ts';
import { CallState } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/online-users.ts';
import { apiBack } from '@/src/api/backend.ts';
import {
  simulateAcceptIncomingCall,
  simulateCompleteCall,
  simulateUpdateCall,
  simulateResetCall,
} from './simulation.ts';
import properties from '../../properties';

const { isSimulation } = properties;

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => void;
  updateCall: (callId: string, updates: Partial<CallState>) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  incomingCallAccepted: () => void;
  resetSimulation: () => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  dailyService: IDailyService,
): CallActions => {
  return {
    incomingCallAccepted: async () => {
      useIncomingCallStore.getState().cancel();
      useCallViewStore.getState().setViewState('in-call');
      const users = await fetchOnlineUsers();
      useOnlineUsersStore.setState({ users });
    },

    acceptIncomingCall: async () => {
      if (isSimulation) {
        simulateAcceptIncomingCall(set);
        return;
      }

      const incomingCall = useIncomingCallStore.getState().incomingCall;
      if (!incomingCall) return;

      const { users } = useOnlineUsersStore.getState();
      const customer = users.find(u => u.id === incomingCall.customerId);
      const attendant = users.find(u => u.id === incomingCall.attendantId);
      if (!customer || !attendant) return;

      try {
        await apiBack.post('/incoming-calls/accept', {
          attendantId: attendant.id,
          userId: attendant.id,
        });
      } catch (err) {
        console.error('[IAM] accept incoming call failed:', err);
        return;
      }

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
