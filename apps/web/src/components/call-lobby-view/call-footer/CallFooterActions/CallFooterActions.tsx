import React, { useState } from 'react';
import { useCallStore } from '../../../../states/call/store.ts';
import { useCallViewStore } from '../../../../states/call-view/store.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';
import { useOnlineUsersStore } from '../../../../states/online-users/store.ts';
import { useIncomingCallStore } from '../../../../states/incoming-call/store.ts';
import { CallState } from '@/src/states/call/state.ts';
import { StartCallButton } from './StartCallButton.tsx';
import { AnswerCallButton } from './AnswerCallButton.tsx';
import { EndCallButton } from './EndCallButton.tsx';
import { CancelCallButton } from './CancelCallButton.tsx';
import { ReturnButton } from './ReturnButton.tsx';
import { ConfirmCloseCallModal } from '../../ConfirmCloseCallModal.tsx';

export const CallFooterActions: React.FC = () => {
  const call = useCallStore(s => s.call);
  const incomingCall = useIncomingCallStore(s => s.incomingCall);
  const sendIncomingCall = useIncomingCallStore(s => s.sendIncomingCall);
  const selectedAttendantId = useCallViewStore(s => s.selectedAttendantId);
  const viewState = useCallViewStore(s => s.viewState);
  const currentUser = useCurrentUserStore(s => s.currentUser);
  const users = useOnlineUsersStore(s => s.users);

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

  const selectedAttendant = selectedAttendantId ? users.find(u => u.id === selectedAttendantId) : null;
  const draftCall: CallState | undefined = (selectedAttendantId && selectedAttendant && !call && currentUser)
    ? {
        id: `draft-call-${selectedAttendantId}`,
        customerId: currentUser.id,
        customerName: currentUser.name,
        attendantId: selectedAttendantId,
        attendantName: selectedAttendant.name,
        roomName: '',
        sessionId: '',
        status: 'draft-lobby' as any,
        wasAnswered: false,
        tokensCharged: 0,
      }
    : undefined;

  const currentCall = call ?? draftCall;
  const isReceiving = currentUser?.id === incomingCall?.attendantId;

  const handleStartCall = () => {
    sendIncomingCall(currentUser?.id, selectedAttendantId);
  };

  const handleReturnCall = () => {
    if (!currentCall) return;
    useCallStore.getState().updateCall(currentCall.id, { status: 'active' });
  };

  const handleAnswerCall = () => {
    useCallStore.getState().answerIncomingCall();
  };

  const handleCancelCall = () => {
    useCallStore.getState().cancelCall();
  };

  const handleHangUp = () => {
    setIsConfirmCloseOpen(true);
  };

  const handleConfirmClose = () => {
    if (currentCall) {
      useCallStore.getState().completeCall();
    }
    setIsConfirmCloseOpen(false);
  };

  const handleCancelClose = () => {
    setIsConfirmCloseOpen(false);
  };

  if (viewState === 'none') return null;

  if (viewState === 'in-call') {
    return (
      <>
        <EndCallButton
          label="Finish"
          onClick={() => {
            if (currentCall) handleHangUp();
          }}
        />
        <ConfirmCloseCallModal
          isOpen={isConfirmCloseOpen}
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
        />
      </>
    );
  }

  if (incomingCall && !isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  if (incomingCall && isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <AnswerCallButton onClick={handleAnswerCall} />
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  if (viewState === 'call-interrupteded') {
    return <ReturnButton onClick={handleReturnCall} />;
  }

  return <StartCallButton onClick={handleStartCall} />;
};
