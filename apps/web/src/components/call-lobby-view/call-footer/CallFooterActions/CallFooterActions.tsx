import React, { useState } from 'react';
import { useCallStore, useCallViewStore, useCurrentUserStore, useIncomingCallStore } from '../../../../states/stores.ts';
import { StartCallButton } from './StartCallButton.tsx';
import { AcceptCallButton } from './AcceptCallButton.tsx';
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

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

  const currentCall = call;
  const isReceiving = currentUser?.id === incomingCall?.attendantId;

  const handleStartCall = () => {
    sendIncomingCall(currentUser?.id, selectedAttendantId);
  };

  const handleReturnCall = () => {
    useCallViewStore.getState().setViewState('in-call');
  };

  const handleAcceptCall = () => {
    useCallStore.getState().acceptedIncomingCall();
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

  if (viewState === 'awaiting-answer') {
    return <CancelCallButton onClick={handleCancelCall} />;
  }

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
        <AcceptCallButton onClick={handleAcceptCall} />
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  if (viewState === 'call-interrupted') {
    return <ReturnButton onClick={handleReturnCall} />;
  }

  return <StartCallButton onClick={handleStartCall} />;
};
