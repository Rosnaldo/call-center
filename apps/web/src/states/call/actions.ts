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
  callCompleted: (call: CallState) => Promise<void>;
  syncActiveCall: (call: CallState | null, shouldJoin: boolean, isLeader: boolean) => Promise<void>;
  partnerReconnected: (call: CallState) => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  get: () => CallStore,
  dailyService: IDailyService,
  ref: StoresRef,
): CallActions => {
  const syncCallWithBillingAndTimer = (call: CallState) => {
    set(() => ({ call }));
    ref.timer.getState().syncFromCall(call);
    ref.billing.getState().setInitialTokens(call.tokensToBeCharged);
    ref.incomingCall.setState({ incomingCall: null });
  };

  return {
    // Fed by the call-events SSE stream now (see init-call-events.ts) — the
    // published payload already carries the full CallState, so no more
    // fetchOnlineUsers/fetchCall round trips to reconstruct it. Every open
    // tab gets this independently (that stream isn't leader-elected like the
    // websocket is), so the Daily join itself is gated behind isLeader —
    // same as syncActiveCall — while the call data syncs everywhere either
    // way, so useCallViewState can still derive 'in-call-in-another' for
    // the other tabs.
    incomingCallAccepted: async (call: CallState) => {
      stopRingtone();

      try {
        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        syncCallWithBillingAndTimer(call);

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

    callCompleted: async (call: CallState) => {
      syncCallWithBillingAndTimer(call);
      ref.billing.getState().openCalculationModal();
    },

    // isLeader still gates the Daily join itself (only the tab holding the
    // real websocket ever actually joins — see InitWs/WsUsersService); what
    // viewState shows for it is purely derived now, see useCallViewState.
    syncActiveCall: async (call: CallState | null, shouldJoin: boolean, isLeader: boolean) => {
      try {
        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        // Server confirms there's no call for us (e.g. it was completed/deleted
        // while we were disconnected) — clear any stale call state instead of
        // leaving the client stuck showing a call that no longer exists.
        if (!call) {
          resetCallState();
          return;
        }

        syncCallWithBillingAndTimer(call);

        if (!isLeader || call.isClosed || !shouldJoin) return;

        await dailyService.join({
          room: call.roomName,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      } catch (error) {
        handleRequestError(error);
      }
    },

    partnerReconnected: (call: CallState) => {
      syncCallWithBillingAndTimer(call);
    },
  };
};
