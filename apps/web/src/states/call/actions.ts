import { IncomingCallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { CallState, CallStore } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';
import { fetchCall, completeCall as completeCallService } from '@/src/services/api/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/api/incoming-calls.ts';
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
  get: () => CallStore,
  dailyService: IDailyService,
  ref: StoresRef,
): CallActions => {
  return {
    incomingCallAccepted: async (incomingCall: IncomingCallState) => {
      ref.incomingCall.setState({ incomingCall: null });

      try {
        const call = await fetchCall(incomingCall.customerId, incomingCall.attendantId);
        set(() => ({ call }));

        const updatedUsers = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users: updatedUsers });

        const customer = updatedUsers.find(u => u.id === incomingCall.customerId);
        const attendant = updatedUsers.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) return;

        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) return;

        dailyService.join({
          room: `${customer.slug}--${attendant.slug}`,
          userName: currentUser.name,
          userData: { id: currentUser.id, role: currentUser.role },
        });

        ref.callView.getState().setViewState('in-call');
      } catch (error) {
        handleRequestError(error);
      }
    },

    acceptIncomingCall: async () => {
      if (isSimulation) {
        simulateAcceptIncomingCall(set);
        return;
      }

      const incomingCall = ref.incomingCall.getState().incomingCall;
      if (!incomingCall) return;

      const { users } = ref.onlineUsers.getState();
      const customer = users.find(u => u.id === incomingCall.customerId);
      const attendant = users.find(u => u.id === incomingCall.attendantId);
      if (!customer || !attendant) return;

      try {
        await acceptIncomingCallService(attendant.id);
        ref.callView.getState().setViewState('in-call');
      } catch (error) {
        handleRequestError(error);
        return;
      }
    },

    completeCall: async () => {
      if (isSimulation) {
        simulateCompleteCall(set);
        return;
      }

      const activeCall = get().call;

      ref.callView.getState().setViewState('none');
      ref.callView.getState().setSelectedAttendantId(null);
      set(() => ({ call: null }));
      dailyService.leave().catch(() => {});

      try {
        if (activeCall) {
          await completeCallService(activeCall.customerId, activeCall.attendantId);
        }
        const users = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users });
      } catch (error) {
        handleRequestError(error);
      }
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
