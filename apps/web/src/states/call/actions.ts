import { CallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { CallStore } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { completeCall as completeCallApi } from '@/src/services/api/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/api/incoming-calls.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playNotificationChime, stopRingtone } from '../../utils/helpers.ts';
import { resetCallState } from '../reset-call-state.ts';

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => Promise<void>;
  incomingCallAccepted: (call: CallState) => void;
  callCompleted: () => Promise<void>;
  syncActiveCall: (call: CallState | null, isLeader: boolean) => Promise<void>;
  updateCall: (call: CallState | null) => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  get: () => CallStore,
  dailyService: IDailyService,
  ref: StoresRef,
): CallActions => {
  // incomingCall is no longer cleared here — IAM publishes update_incomingcall
  // (null) alongside update_call for every case where accepting a call ends
  // the incoming-call phase (see notifyCallAccepted in call_events.ts), so
  // that store's own updateIncomingCall handler is the only thing that
  // touches it now.
  const syncCallWithBillingAndTimer = (call: CallState) => {
    set(() => ({ call }));
    ref.timer.getState().syncFromCall(call);
    ref.billing.getState().setInitialTokens(call.tokensToBeCharged);
  };

  return {
    // Fed by the call-events SSE stream now (see init-call-events.ts) — the
    // published payload carries the room to join, while the CallState itself
    // is applied separately by updateCall (fed by the same stream's
    // update_call event). Every open tab gets this independently (that
    // stream isn't leader-elected like the websocket is), so the Daily join
    // itself is gated behind isLeader — same as syncActiveCall.
    incomingCallAccepted: async (call: CallState) => {
      stopRingtone();

      try {
        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        if (!ref.callView.getState().isLeader) return;

        await dailyService.join({
          room: call.roomName,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      } catch (error) {
        handleRequestError(error);
      }
    },

    // Business validation (customer/attendant existence) lives in IAM's
    // /incoming-calls/accept controller — see the analogous cleanup in
    // incoming-call/actions.ts's sendIncomingCall.
    acceptIncomingCall: async () => {
      try {
        const incomingCall = ref.incomingCall.getState().incomingCall;
        if (!incomingCall) return;

        stopRingtone();
        playNotificationChime();
        await acceptIncomingCallService(incomingCall.attendantId);
      } catch (error) {
        handleRequestError(error);
      }
    },

    completeCall: async () => {
      try {
        const { call } = get();
        if (!call) throw new ApiError(i18n.t('error.callNotFound'));

        await completeCallApi(call.customerId, call.attendantId);
      } catch (error) {
        handleRequestError(error);
      }
    },

    // CallState itself now arrives via updateCall (update_call event) —
    // this only opens the modal.
    callCompleted: async () => {
      ref.billing.getState().openCalculationModal();
    },

    // isLeader still gates the Daily join itself (only the tab holding the
    // real websocket ever actually joins — see InitWs/WsUsersService); what
    // viewState shows for it is purely derived now, see useCallViewState.
    // No more shouldJoin gate: grace_period.ts ejects a disconnecting user
    // from Daily immediately, so by the time this fires on reconnect they're
    // always genuinely out of the room and always need to (re)join.
    syncActiveCall: async (call: CallState | null, isLeader: boolean) => {
      try {
        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        // Server confirms there's no call for us (e.g. it was completed/deleted
        // while we were disconnected) — clear any stale call state instead of
        // leaving the client stuck showing a call that no longer exists. This
        // is a broader reset than updateCall(null): it also wipes chat/callView,
        // which only makes sense for this reconnect self-heal case.
        if (!call) {
          resetCallState();
          return;
        }

        if (!isLeader || call.isClosed) return;

        await dailyService.join({
          room: call.roomName,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      } catch (error) {
        handleRequestError(error);
      }
    },

    // The single source of truth for call state — fed by the call-events SSE
    // stream's update_call event, published by IAM alongside every call
    // mutation (accept, complete, sync, participant add/remove, delete,
    // partner reconnect). Every other call-domain event now only carries its
    // own extra side effect (Daily join, modal, ringtone) and leaves the
    // actual state assignment to this.
    updateCall: (call: CallState | null) => {
      if (!call) {
        set(() => ({ call: null }));
        return;
      }
      syncCallWithBillingAndTimer(call);
    },
  };
};
