import React, { useState } from 'react';
import { useParticipantIds } from '@daily-co/daily-react';
import { useCallStore, useCallViewStore, useCurrentUserStore, useIncomingCallStore } from '../../../../states/stores.ts';
import { useCallViewState } from '../../../../hooks/useCallViewState.ts';
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
  const viewState = useCallViewState();
  const isLeader = useCallViewStore(s => s.isLeader);
  const currentUser = useCurrentUserStore(s => s.currentUser);
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const isReceiving = currentUser?._id === incomingCall?.attendantId;

  const handleStartCall = async () => {
    setIsStarting(true);
    try {
      playNotificationChime();
      await sendIncomingCall(currentUser?._id, selectedAttendantId);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAcceptCall = async () => {
    setIsAccepting(true);
    try {
      await useCallStore.getState().acceptIncomingCall();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancelCall = async () => {
    setIsCancelling(true);
    try {
      await useIncomingCallStore.getState().cancelIncomingCall();
    } finally {
      setIsCancelling(false);
    }
  };

  const handleHangUp = () => {
    setIsConfirmCloseOpen(true);
  };

  const handleConfirmClose = async () => {
    await useCallStore.getState().completeCall();
    setIsConfirmCloseOpen(false);
  };

  const handleCancelClose = () => {
    setIsConfirmCloseOpen(false);
  };

  // 'in-call-in-another' means some other tab holds the real meeting (see
  // syncActiveCall/updateCall) — nothing in this footer acts on the
  // call from here, same as 'none'. 'call-closing' means completeCall was
  // already requested (call.isClosed) — teardown is in flight, no action left.
  if (viewState === 'none' || viewState === 'in-call-in-another' || viewState === 'call-closing') return null;

  if (viewState === 'in-call') {
    // The remote participant's Daily track hasn't necessarily caught up
    // with the server-side call/webhook state yet (see ActiveVideoViewport's
    // own "waiting to join" — same signal). Ending the call before that
    // lands races the Daily meeting.ended webhook the billing modal depends on.
    const canEndCall = remoteParticipantIds.length > 0;
    return (
      <>
        <EndCallButton
          label="Finish"
          onClick={handleHangUp}
          disabled={!call || !canEndCall || !isLeader}
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
    return <CancelCallButton onClick={handleCancelCall} isLoading={isCancelling} disabled={!!call || !isLeader} />;
  }

  if (viewState === 'awaiting-to-answer' && !isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <CancelCallButton onClick={handleCancelCall} isLoading={isCancelling} disabled={!!call || !isLeader} />
      </div>
    );
  }

  if (viewState === 'awaiting-to-answer' && isReceiving) {
    return (
      <div className="flex gap-2.5 items-center">
        <AcceptCallButton onClick={handleAcceptCall} isLoading={isAccepting} disabled={!isLeader} />
        <CancelCallButton onClick={handleCancelCall} isLoading={isCancelling} disabled={!!call || !isLeader} />
      </div>
    );
  }

  return <StartCallButton onClick={handleStartCall} isLoading={isStarting} disabled={!!call || !!incomingCall || !isLeader} />;
};
