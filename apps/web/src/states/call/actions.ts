import { CallState, IncomingCallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { CallStore } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';
import { fetchCall, completeCall as completeCallApi } from '@/src/services/api/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/api/incoming-calls.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';
import { playNotificationChime, stopRingtone } from '../../utils/helpers.ts';
import { resetCallState } from '../reset-call-state.ts';

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => Promise<void>;
  incomingCallAccepted: (incomingCall: IncomingCallState) => void;
  callCompleted: (call: CallState) => Promise<void>;
  syncActiveCall: (call: CallState | null, shouldJoin: boolean, isLeader: boolean) => Promise<void>;
  partnerReconnected: (call: CallState, isLeader: boolean) => void;
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
    incomingCallAccepted: async (incomingCall: IncomingCallState) => {
      stopRingtone();

      try {
        const updatedUsers = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users: updatedUsers });

        const customer = updatedUsers.find(u => u.id === incomingCall.customerId);
        const attendant = updatedUsers.find(u => u.id === incomingCall.attendantId);
        if (!customer) throw new ApiError(i18n.t('error.customerNotFound'));
        if (!attendant) throw new ApiError(i18n.t('error.attendantNotFound'));

        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        await dailyService.join({
          room: `${customer.slug}--${attendant.slug}`,
          userId: currentUser.id,
          userName: currentUser.name,
        });

        ref.callView.getState().setViewState('in-call');

        const call = await fetchCall(incomingCall.customerId, incomingCall.attendantId);
        syncCallWithBillingAndTimer(call);

      } catch (error) {
        handleRequestError(error);
      }
    },

    acceptIncomingCall: async () => {
      try {
        const incomingCall = ref.incomingCall.getState().incomingCall;
        if (!incomingCall) throw new ApiError(i18n.t('error.incomingCallNotFound'));

        const { users } = ref.onlineUsers.getState();
        const customer = users.find(u => u.id === incomingCall.customerId);
        const attendant = users.find(u => u.id === incomingCall.attendantId);
        if (!customer) throw new ApiError(i18n.t('error.customerNotFound'));
        if (!attendant) throw new ApiError(i18n.t('error.attendantNotFound'));

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
        if (!call) throw new ApiError(i18n.t('error.callNotFound'));

        await completeCallApi(call.customerId, call.attendantId);
      } catch (error) {
        handleRequestError(error);
      }
    },

    callCompleted: async (call: CallState) => {
      syncCallWithBillingAndTimer(call);
      ref.callView.getState().setViewState('call-closing');
      ref.billing.getState().openCalculationModal();
    },

    // isLeader gates both the viewState flip and the Daily join — it's false
    // on every tab except the one holding the real websocket (see
    // InitWs/WsUsersService), so a user with several tabs open only ever
    // actually joins the meeting from one of them. The other tabs still get
    // `call` populated above via syncCallWithBillingAndTimer (so timer/billing
    // stay in sync), but land on 'in-call-in-another' instead of 'in-call' —
    // see CallViewport for that screen.
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
        // isClosed wins over leader/follower — a call mid-teardown (complete
        // requested, Daily/billing cleanup still in flight) isn't something
        // any tab should be joining or showing as a live meeting.
        if (call.isClosed) {
          ref.callView.getState().setViewState('call-closing');
          return;
        }
        if (!isLeader) {
          ref.callView.getState().setViewState('in-call-in-another');
          return;
        }
        ref.callView.getState().setViewState('in-call');

        if (shouldJoin) {
          await dailyService.join({
            room: call.roomName,
            userId: currentUser.id,
            userName: currentUser.name,
          });
        }
      } catch (error) {
        handleRequestError(error);
      }
    },

    partnerReconnected: (call: CallState, isLeader: boolean) => {
      syncCallWithBillingAndTimer(call);
      ref.callView.getState().setViewState(call.isClosed ? 'call-closing' : isLeader ? 'in-call' : 'in-call-in-another');
    },
  };
};
