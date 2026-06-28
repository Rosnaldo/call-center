import { IncomingCallState } from '@repo/shared-types';
import { useIncomingCallStore, useCallViewStore, useOnlineUsersStore, useCurrentUserStore } from '../stores.ts';
import { CallState } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/online-users.ts';
import { fetchCall } from '@/src/services/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/incoming-calls.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
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
  meetingStarted: (call: CallState) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  incomingCallAccepted: (incomingCall: IncomingCallState) => void;
  resetSimulation: () => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  dailyService: IDailyService,
): CallActions => {
  return {
    incomingCallAccepted: async (incomingCall: IncomingCallState) => {
      useIncomingCallStore.setState({ incomingCall: null });

      try {
        const call = await fetchCall(incomingCall.customerId, incomingCall.attendantId);
        set(() => ({ call }));

        const updatedUsers = await fetchOnlineUsers();
        useOnlineUsersStore.setState({ users: updatedUsers });

        const customer = updatedUsers.find(u => u.id === incomingCall.customerId);
        const attendant = updatedUsers.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) return;

        const currentUser = useCurrentUserStore.getState().currentUser;
        if (!currentUser) return;

        dailyService.join({
          room: `${customer.slug}--${attendant.slug}`,
          userName: currentUser.name,
          userData: { id: currentUser.id, role: currentUser.role },
        });

        useCallViewStore.getState().setViewState('in-call');
      } catch (error) {
        handleRequestError(error);
      }
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
        await acceptIncomingCallService(attendant.id);
        useCallViewStore.getState().setViewState('in-call');
      } catch (error) {
        handleRequestError(error);
        return;
      }
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

    meetingStarted: async (_newCall: CallState) => {},
    updateJoinedView: async (_newCall: CallState) => {},
    updateLeftView: async (_newCall: CallState) => {},

    resetSimulation: () => {
      if (isSimulation) {
        simulateResetCall(set);
      }
    },
  };
};
