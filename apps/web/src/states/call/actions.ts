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

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => Promise<void>;
  incomingCallAccepted: (incomingCall: IncomingCallState) => void;
  callCompleted: () => Promise<void>;
  syncActiveCall: (call: CallState | null, shouldJoin: boolean) => Promise<void>;
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

    callCompleted: async () => {
      ref.billing.getState().openCalculationModal();
    },

    syncActiveCall: async (call: CallState | null, shouldJoin: boolean) => {
      try {
        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.currentUserNotFound'));

        // Server confirms there's no call for us (e.g. it was completed/deleted
        // while we were disconnected) — clear any stale call state instead of
        // leaving the client stuck showing a call that no longer exists.
        if (!call) {
          ref.timer.getState().reset();
          ref.callView.getState().resetCallViewState();
          set(() => ({ call: null }));
          ref.incomingCall.setState({ incomingCall: null });
          ref.chat.getState().resetChat();
          return;
        }

        syncCallWithBillingAndTimer(call);
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

    partnerReconnected: (call: CallState) => {
      syncCallWithBillingAndTimer(call);
      ref.callView.getState().setViewState('in-call');
    },
  };
};
