import { CallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { mytoast } from '../../components/toast';
import i18n from '../../i18n.ts';

export interface MeetingActions {
  meetingEnded: (call: CallState) => void;
  userDisconnected: (data: { id: string; call?: CallState }) => void;
  userTokensUpdated: (data: { id: string; tokens?: number }) => void;
}

export const createMeetingActions = (
  ref: StoresRef,
): MeetingActions => {
  return {
    // call itself is nulled independently now, via the call-events SSE
    // stream's update_call event (see call/actions.ts's updateCall) — this
    // still runs for every other side effect of the call ending
    // (billing/chat/timer), fed by the websocket's meeting_ended. Online
    // users' status is no longer set here — it arrives via the
    // update_online_users event fired alongside this one.
    meetingEnded: (call: CallState) => {
      ref.timer.getState().reset();
      ref.callView.getState().setSelectedAttendantId(null);

      const currentUser = ref.currentUser.getState().currentUser;
      if (currentUser) {
        ref.currentUser.getState().setCurrentUser({ ...currentUser, status: 'idle' });
      }

      ref.billing.getState().closeCalculationModal();
      ref.billing.getState().openSummaryModal(call);

      ref.chat.getState().resetChat();
    },
    userDisconnected: (data) => {
      const currentUser = ref.currentUser.getState().currentUser;
      if (currentUser && data.id !== currentUser.id && data.call) {
        const { call } = data;
        const name = call.customerId === data.id ? call.customerName : call.attendantName;
        mytoast.warn(i18n.t('call.participantDisconnected', { name }));
      }
    },
    // Online users' tokens are no longer set here — they arrive via the
    // update_online_users event fired alongside this one.
    userTokensUpdated: (data) => {
      const currentUser = ref.currentUser.getState().currentUser;
      if (currentUser && currentUser.id === data.id) {
        ref.currentUser.getState().setCurrentUser({ ...currentUser, tokens: data.tokens });
      }
    },
  };
};
