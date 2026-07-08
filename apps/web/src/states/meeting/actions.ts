/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallState } from '@repo/shared-types';
import type { StoresRef } from '../stores.ts';
import { mytoast } from '../../components/toast';
import i18n from '../../i18n.ts';

export interface MeetingActions {
  meetingStarted: (call: CallState) => void;
  updateJoinedView: (call: CallState) => void;
  updateLeftView: (call: CallState) => void;
  meetingEnded: (call: CallState) => void;
  userDisconnecting: (data: { id: string; call?: CallState }) => void;
  userDisconnected: (data: { id: string; call?: CallState }) => void;
  userTokensUpdated: (data: { id: string; tokens?: number }) => void;
}

export const createMeetingActions = (
  ref: StoresRef,
): MeetingActions => {
  const syncCall = (newCall: CallState) => {
    ref.call.setState({ call: newCall });
    ref.timer.getState().syncFromCall(newCall);
    ref.billing.getState().setInitialTokens(newCall.tokensToBeCharged);
    // `call` is authoritative now — drop the incomingCall bridge CallViewport
    // was using as a partner-lookup fallback while it hadn't loaded yet.
    ref.incomingCall.setState({ incomingCall: null });
  };

  return {
    meetingStarted: syncCall,
    // A real Daily rejoin is the actual signal the call is back, not just the
    // websocket reconnecting — so this is also what takes the view out of
    // 'call-interrupted' (set by the user_disconnecting handler) once the
    // partner is really back in the room.
    updateJoinedView: (call: CallState) => {
      syncCall(call);
      if (ref.callView.getState().viewState === 'call-interrupted') {
        ref.callView.getState().setViewState('in-call');
      }
    },
    updateLeftView: syncCall,
    meetingEnded: (call: CallState) => {
      ref.timer.getState().reset();
      ref.callView.getState().setViewState('none');
      ref.callView.getState().setSelectedAttendantId(null);
      ref.call.setState({ call: null });

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
    // realtime only sends this to me and my call partner, so if it's not
    // about my own session, it's my partner's.
    userDisconnecting: () => {
      ref.callView.getState().setViewState('call-interrupted');
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
