import { CallState, IncomingCallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { CallStore } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';
import { fetchCall, completeCall as completeCallApi, syncCall } from '@/src/services/api/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/api/incoming-calls.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playNotificationChime, stopRingtone } from '../../utils/helpers.ts';

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => Promise<void>;
  incomingCallAccepted: (incomingCall: IncomingCallState) => void;
  callCompleted: () => Promise<void>;
  syncActiveCall: () => Promise<void>;
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
    // `call` is real now, so anything still leaning on `incomingCall` as a
    // stand-in (CallViewport's partner lookup) can drop it.
    ref.incomingCall.setState({ incomingCall: null });
  };

  return {
    // `incomingCall` is intentionally left populated here (not cleared until
    // `call` is actually set, in syncCallWithBillingAndTimer below) — it's
    // CallViewport's only source for the partner's identity while `call`
    // hasn't loaded yet, and clearing it early blanks the partner avatar for
    // the whole "waiting to join" window.
    incomingCallAccepted: async (incomingCall: IncomingCallState) => {
      stopRingtone();

      try {
        const updatedUsers = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users: updatedUsers });

        const customer = updatedUsers.find(u => u.id === incomingCall.customerId);
        const attendant = updatedUsers.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) throw new ApiError(i18n.t('error.somethingWentWrong'));

        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.somethingWentWrong'));

        dailyService.join({
          room: `${customer.slug}--${attendant.slug}`,
          userId: currentUser.id,
          userName: currentUser.name,
        });

        ref.callView.getState().setViewState('in-call');

        // Best-effort: the call record isn't guaranteed to exist yet — it's
        // only created once this join actually lands and onMeetingStarted
        // runs — so a miss here isn't fatal, meeting_started/participant_joined
        // populate `call` moments later regardless.
        try {
          const call = await fetchCall(incomingCall.customerId, incomingCall.attendantId);
          syncCallWithBillingAndTimer(call);
        } catch {
          // not created yet, WS events will fill it in shortly
        }
      } catch (error) {
        handleRequestError(error);
      }
    },

    acceptIncomingCall: async () => {
      try {
        const incomingCall = ref.incomingCall.getState().incomingCall;
        if (!incomingCall) throw new ApiError(i18n.t('error.somethingWentWrong'));

        const { users } = ref.onlineUsers.getState();
        const customer = users.find(u => u.id === incomingCall.customerId);
        const attendant = users.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) throw new ApiError(i18n.t('error.somethingWentWrong'));

        stopRingtone();
        playNotificationChime();
        ref.callView.getState().setViewState('in-call');
        await acceptIncomingCallService(attendant.id);
      } catch (error) {
        handleRequestError(error);
      }
    },

    completeCall: async () => {
      try {
        const { call } = get();
        if (!call) return;

        await completeCallApi(call.customerId, call.attendantId);
      } catch (error) {
        handleRequestError(error);
      }
    },

    callCompleted: async () => {
      ref.billing.getState().openCalculationModal();
    },

    // Called on app entry to reconcile IAM's call state against the real
    // Daily meeting — covers refreshes/redis hiccups where the two disagree
    // about whether a call is still going on (see /calls/sync in realtime).
    syncActiveCall: async () => {
      const currentUser = ref.currentUser.getState().currentUser;
      if (!currentUser) return;

      const result = await syncCall();
      if (!result?.call) return;

      const { call, shouldJoin } = result;
      syncCallWithBillingAndTimer(call);
      ref.callView.getState().setViewState('in-call');

      if (shouldJoin) {
        dailyService.join({
          room: call.roomName,
          userId: currentUser.id,
          userName: currentUser.name,
        });
      }
    },

    // The partner's websocket reconnected within its grace period (see
    // partner_reconnected in realtime) — take the view back out of
    // 'call-interrupted' now rather than waiting for their Daily rejoin,
    // which updateJoinedView also covers if this fires first.
    partnerReconnected: (call: CallState) => {
      syncCallWithBillingAndTimer(call);
      ref.callView.getState().setViewState('in-call');
    },
  };
};
