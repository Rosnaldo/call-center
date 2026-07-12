import { IncomingCallState } from '@repo/shared-types';
import { IncomingCallStore } from './state.ts';
import type { StoresRef } from '../stores.ts';
import { sendIncomingCall as sendIncomingCallService, cancelIncomingCall as cancelIncomingCallService } from '../../services/api/incoming-calls.ts';
import { handleRequestError } from '../../utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playRingtone, stopRingtone } from '../../utils/helpers.ts';

export interface IncomingCallActions {
  cancelIncomingCall: () => Promise<void>;
  sendIncomingCall: (customerId?: string, attendantId?: string | null) => Promise<void>;
  incomingCallReceived: () => void;
  incomingCallCancelled: () => void;
  updateIncomingCall: (incomingCall: IncomingCallState | null) => void;
}

export const createIncomingCallActions = (
  set: (arg: Partial<IncomingCallStore> | ((state: IncomingCallStore) => Partial<IncomingCallStore>)) => void,
  get: () => IncomingCallStore,
  ref: StoresRef,
): IncomingCallActions => ({
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

  // IncomingCallState itself now arrives via updateIncomingCall
  // (update_incomingcall event) — this only plays the ringtone.
  incomingCallReceived: () => {
    playRingtone();
  },
  incomingCallCancelled: () => {
    stopRingtone();
    ref.callView.getState().setSelectedAttendantId(null);
  },

  // The single source of truth for incoming-call state — fed by the
  // call-events SSE stream's update_incomingcall event, published by IAM
  // alongside send/cancel/accept. Every other incoming-call-domain event now
  // only carries its own extra side effect (ringtone, clearing the selected
  // attendant) and leaves the actual state assignment to this.
  updateIncomingCall: (incomingCall: IncomingCallState | null) => {
    set({ incomingCall });
  },
});
