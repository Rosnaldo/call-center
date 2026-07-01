import { IncomingCallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { CallState, CallStore } from './state.ts';
import type { IDailyService } from '../../services/daily.ts';
import { fetchOnlineUsers } from '@/src/services/api/online-users.ts';
import { fetchCall, completeCall as completeCallService } from '@/src/services/api/calls.ts';
import { acceptIncomingCall as acceptIncomingCallService } from '@/src/services/api/incoming-calls.ts';
import { handleRequestError } from '@/src/utils/utils.ts';
import { ApiError } from '../../error/api.ts';
import i18n from '../../i18n.ts';

export interface CallActions {
  acceptIncomingCall: () => Promise<void> | void;
  completeCall: () => void;
  meetingStarted: (call: CallState) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  incomingCallAccepted: (incomingCall: IncomingCallState) => void;
}

export const createCallActions = (
  set: (fn: (state: any) => any) => void,
  get: () => CallStore,
  dailyService: IDailyService,
  ref: StoresRef,
): CallActions => {
  return {
    incomingCallAccepted: async (incomingCall: IncomingCallState) => {
      ref.incomingCall.setState({ incomingCall: null });

      try {
        const call = await fetchCall(incomingCall.customerId, incomingCall.attendantId);
        set(() => ({ call }));

        const updatedUsers = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users: updatedUsers });

        const customer = updatedUsers.find(u => u.id === incomingCall.customerId);
        const attendant = updatedUsers.find(u => u.id === incomingCall.attendantId);
        if (!customer || !attendant) throw new ApiError(i18n.t('error.somethingWentWrong'));

        const currentUser = ref.currentUser.getState().currentUser;
        if (!currentUser) throw new ApiError(i18n.t('error.somethingWentWrong'));

        dailyService.join({
          room: `${customer.slug}--${attendant.slug}`,
          userName: currentUser.name,
          userData: { id: currentUser.id, role: currentUser.role },
        });

        ref.callView.getState().setViewState('in-call');
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

        await acceptIncomingCallService(attendant.id);
        ref.callView.getState().setViewState('in-call');
      } catch (error) {
        handleRequestError(error);
      }
    },

    completeCall: async () => {
      const activeCall = get().call;

      ref.callView.getState().setViewState('none');
      ref.callView.getState().setSelectedAttendantId(null);
      set(() => ({ call: null }));

      try {
        await dailyService.leave();
        if (activeCall) {
          await completeCallService(activeCall.customerId, activeCall.attendantId);
        }
        const users = await fetchOnlineUsers();
        ref.onlineUsers.setState({ users });
      } catch (error) {
        handleRequestError(error);
      }
    },

    meetingStarted: async (newCall: CallState) => {
      set(() => ({ call: newCall }));
      ref.timer.getState().syncFromCall(newCall);
    },
    updateJoinedView: async (newCall: CallState) => {
      set(() => ({ call: newCall }));
      ref.timer.getState().syncFromCall(newCall);
    },
    updateLeftView: async (newCall: CallState) => {
      set(() => ({ call: newCall }));
      ref.timer.getState().syncFromCall(newCall);
    },
  };
};
