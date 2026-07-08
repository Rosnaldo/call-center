import React, { useState } from 'react';
import { useCallStore, useCallViewStore, useCurrentUserStore, useIncomingCallStore } from '../../../../states/stores.ts';
import { StartCallButton } from './StartCallButton.tsx';
import { AcceptCallButton } from './AcceptCallButton.tsx';
import { EndCallButton } from './EndCallButton.tsx';
import { CancelCallButton } from './CancelCallButton.tsx';
import { playNotificationChime } from '../../../../utils/helpers.ts';

import { ConfirmCloseCallModal } from '../../ConfirmCloseCallModal.tsx';

export const CallFooterActions: React.FC = () => {
  const call = useCallStore(s => s.call);
  const incomingCall = useIncomingCallStore(s => s.incomingCall);
  const sendIncomingCall = useIncomingCallStore(s => s.sendIncomingCall);
  const selectedAttendantId = useCallViewStore(s => s.selectedAttendantId);
  const viewState = useCallViewStore(s => s.viewState);
  const currentUser = useCurrentUserStore(s => s.currentUser);

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

  const currentCall = call;
  const isReceiving = currentUser?.id === incomingCall?.attendantId;

  const handleStartCall = () => {
    playNotificationChime();
    sendIncomingCall(currentUser?.id, selectedAttendantId);
  };

  const handleAcceptCall = () => {
    useCallStore.getState().acceptIncomingCall();
  };

  const handleCancelCall = () => {
    useIncomingCallStore.getState().cancelIncomingCall();
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

  // No manual "return" control while interrupted — that resolves on its own,
  // either via the partner's real rejoin or their websocket reconnecting.
  // Ending the call outright is still available, same as a normal in-call.
  if (viewState === 'in-call' || viewState === 'call-interrupted') {
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

  if (viewState === 'awaiting-answer') {
    return <CancelCallButton onClick={handleCancelCall} />;
  }

  if (viewState === 'awaiting-to-answer' && !isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  if (viewState === 'awaiting-to-answer' && isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <AcceptCallButton onClick={handleAcceptCall} />
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  return <StartCallButton onClick={handleStartCall} />;
};
