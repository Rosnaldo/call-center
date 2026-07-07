import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import type { StoresRef } from '../stores.ts';
import { sendIncomingCall as sendIncomingCallService, cancelIncomingCall as cancelIncomingCallService } from '../../services/api/incoming-calls.ts';
import { fetchOnlineUsers } from '../../services/api/online-users.ts';
import { handleRequestError } from '../../utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playRingtone } from '../../utils/helpers.ts';

export interface IncomingCallActions {
  cancel: () => void;
  cancelIncomingCall: () => void;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => void;
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

  cancelIncomingCall: async () => {
    try {
      const incomingCall = get().incomingCall;
      if (!incomingCall) throw new ApiError(i18n.t('error.somethingWentWrong'));

      set({ incomingCall: null });
      ref.callView.getState().setViewState('none');
      ref.callView.getState().setSelectedAttendantId(null);

      await cancelIncomingCallService(incomingCall.customerId, incomingCall.attendantId);
    } catch (error) {
      handleRequestError(error);
    }
  },

  sendIncomingCall: async (customerId, attendantId) => {
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
    playRingtone();
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
