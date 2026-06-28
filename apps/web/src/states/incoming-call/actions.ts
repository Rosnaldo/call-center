import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import { useOnlineUsersStore, useCallViewStore } from '../stores.ts';
import { sendIncomingCall as sendIncomingCallService, cancelIncomingCall as cancelIncomingCallService } from '@/src/services/api/incoming-calls.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';
import {
  simulateSendIncomingCall,
  simulateCancelIncomingCall,
  simulateIncomingCall,
  simulateIncomingCallAsCustomer,
} from './simulation.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
import properties from '../../properties';

const { isSimulation } = properties;

export interface IncomingCallActions {
  cancel: () => void;
  cancelIncomingCall: () => void;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => void;
  simulateIncomingCall: (attendantId: string) => void;
  simulateIncomingCallAsCustomer: (customerId: string, attendantId: string) => void;
  incomingCallSent: (incomingCall: IncomingCallState) => void;
  incomingCallReceived: (incomingCall: IncomingCallState) => void;
  incomingCallCancelled: () => void;

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
    useCallViewStore.getState().setViewState('none');
    useCallViewStore.getState().setSelectedAttendantId(null);

    cancelIncomingCallService(incomingCall.customerId, incomingCall.attendantId)
      .catch((error) => handleRequestError(error));
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

    sendIncomingCallService(customerId, attendantId)
      .catch((error) => handleRequestError(error));
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
  incomingCallSent: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    useCallViewStore.getState().setViewState('awaiting-answer');
    try {
      const users = await fetchOnlineUsers();
      useOnlineUsersStore.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallReceived: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    useCallViewStore.getState().setViewState('awaiting-to-answer');
    try {
      const users = await fetchOnlineUsers();
      useOnlineUsersStore.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallCancelled: async () => {
    set({ incomingCall: null });
    useCallViewStore.getState().setViewState('none');
    useCallViewStore.getState().setSelectedAttendantId(null);
    try {
      const users = await fetchOnlineUsers();
      useOnlineUsersStore.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
});
