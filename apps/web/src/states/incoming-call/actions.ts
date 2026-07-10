import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import type { StoresRef } from '../stores.ts';
import { sendIncomingCall as sendIncomingCallService, cancelIncomingCall as cancelIncomingCallService } from '../../services/api/incoming-calls.ts';
import { fetchOnlineUsers } from '../../services/api/online-users.ts';
import { handleRequestError } from '../../utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playRingtone, stopRingtone } from '../../utils/helpers.ts';

export interface IncomingCallActions {
  cancel: () => void;
  cancelIncomingCall: () => Promise<void>;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => Promise<void>;
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
      if (!incomingCall) throw new ApiError(i18n.t('error.incomingCallNotFound'));

      // IAM publishes incoming_call_cancelled back to this same client too
      // (see call_events.ts's notifyIncomingCallCancelled) — incomingCallCancelled
      // below applies the actual state clear once that arrives, no need to
      // set it optimistically here.
      await cancelIncomingCallService(incomingCall.customerId, incomingCall.attendantId);
    } catch (error) {
      handleRequestError(error);
    }
  },

  // Business validation (tokens, attendant status, customer/attendant
  // identity) lives in IAM's /incoming-calls/send controller — duplicating
  // it here just means two places to keep in sync. handleRequestError below
  // surfaces whatever the backend rejects with.
  sendIncomingCall: async (customerId, attendantId) => {
    if (!customerId || !attendantId) return;

    try {
      await sendIncomingCallService(customerId, attendantId);
    } catch (error) {
      handleRequestError(error);
    }
  },

  incomingCallSent: async (incomingCall: IncomingCallState) => {
    console.log('incomingCallSent', incomingCall);
    set({ incomingCall });
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallReceived: async (incomingCall: IncomingCallState) => {
     console.log('incomingCallReceived', incomingCall);
    set({ incomingCall });
    playRingtone();
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
  incomingCallCancelled: async () => {
    stopRingtone();
    set({ incomingCall: null });
    ref.callView.getState().setSelectedAttendantId(null);
    try {
      const users = await fetchOnlineUsers();
      ref.onlineUsers.setState({ users });
    } catch (error) {
      handleRequestError(error);
    }
  },
});
