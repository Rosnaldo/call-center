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
    // stream's call_deleted event (see call/actions.ts's callDeleted) —
    // this still runs for every other side effect of the call ending
    // (onlineUsers/billing/chat/timer), fed by the websocket's meeting_ended.
    meetingEnded: (call: CallState) => {
      ref.timer.getState().reset();
      ref.callView.getState().setSelectedAttendantId(null);

      const currentUser = ref.currentUser.getState().currentUser;
      if (currentUser) {
        ref.currentUser.getState().setCurrentUser({ ...currentUser, status: 'idle' });
      }

      ref.onlineUsers.getState().updateUser(call.customerId, { status: 'idle' });
      ref.onlineUsers.getState().updateUser(call.attendantId, { status: 'idle' });

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
    userTokensUpdated: (data) => {
      ref.onlineUsers.getState().updateUser(data.id, { tokens: data.tokens });

      const currentUser = ref.currentUser.getState().currentUser;
      if (currentUser && currentUser.id === data.id) {
        ref.currentUser.getState().setCurrentUser({ ...currentUser, tokens: data.tokens });
      }
    },
  };
};
