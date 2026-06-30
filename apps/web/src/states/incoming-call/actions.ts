import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import type { StoresRef } from '../stores.ts';
import { sendIncomingCall as sendIncomingCallService, cancelIncomingCall as cancelIncomingCallService } from '../../services/api/incoming-calls.ts';
import { fetchOnlineUsers } from '../../services/api/online-users.ts';
import {
  simulateSendIncomingCall,
  simulateCancelIncomingCall,
  simulateIncomingCall,
  simulateIncomingCallAsCustomer,
} from './simulation.ts';
import { handleRequestError } from '../../utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import properties from '../../properties';

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
  ref: StoresRef,
): IncomingCallActions => ({
  cancel: () => set({ incomingCall: null }),

  cancelIncomingCall: () => {
    if (properties.isSimulation) {
      simulateCancelIncomingCall(set, get);
      return;
    }

    const incomingCall = get().incomingCall;
    if (!incomingCall) return;

    set({ incomingCall: null });
    ref.callView.getState().setViewState('none');
    ref.callView.getState().setSelectedAttendantId(null);

    cancelIncomingCallService(incomingCall.customerId, incomingCall.attendantId)
      .catch((error) => handleRequestError(error));
  },

  sendIncomingCall: async (customerId, attendantId) => {
    if (properties.isSimulation) {
      simulateSendIncomingCall(set, customerId, attendantId);
      return;
    }

    try {
      if (!customerId || !attendantId) throw new ApiError(i18n.t('error.somethingWentWrong'));

      const currentUser = ref.currentUser.getState().currentUser;
      if (!currentUser || currentUser.id !== customerId) throw new ApiError(i18n.t('error.somethingWentWrong'));

      if ((currentUser.tokens ?? 0) <= 0) throw new ApiError(i18n.t('attendantList.noTokensHint'));

      const { users } = ref.onlineUsers.getState();
      const attendant = users.find(u => u.id === attendantId);
      if (!attendant) throw new ApiError(i18n.t('error.somethingWentWrong'));

      if (attendant.status !== 'idle') throw new ApiError(i18n.t('attendantList.attendantBusy'));

      await sendIncomingCallService(customerId, attendantId);
    } catch (error) {
      handleRequestError(error);
    }
  },

  simulateIncomingCall: (attendantId) => {
    if (properties.isSimulation) {
      simulateIncomingCall(set, get, attendantId);
    }
  },

  simulateIncomingCallAsCustomer: (customerId, attendantId) => {
    if (properties.isSimulation) {
      simulateIncomingCallAsCustomer(set, get, customerId, attendantId);
    }
  },
  incomingCallSent: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    ref.callView.getState().setViewState('awaiting-answer');
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallReceived: async (incomingCall: IncomingCallState) => {
    set({ incomingCall });
    ref.callView.getState().setViewState('awaiting-to-answer');
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallCancelled: async () => {
    set({ incomingCall: null });
    ref.callView.getState().setViewState('none');
    ref.callView.getState().setSelectedAttendantId(null);
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
});
