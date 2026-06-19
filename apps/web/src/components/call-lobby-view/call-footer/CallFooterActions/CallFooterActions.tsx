import React, { useState } from 'react';
import { useCallStore } from '../../../../states/call/store.ts';
import { useCallViewStore } from '../../states/store.ts';
import { useCurrentUserStore } from '../../../../states/current-user/store.ts';
import { useOnlineUsersStore } from '../../../../states/online-users/store.ts';
import { playNotificationChime } from '../../../../utils/helpers.ts';
import { CallState } from '@/src/states/call/state.ts';
import { StartCallButton } from './StartCallButton.tsx';
import { AnswerCallButton } from './AnswerCallButton.tsx';
import { EndCallButton } from './EndCallButton.tsx';
import { CancelCallButton } from './CancelCallButton.tsx';
import { ReturnButton } from './ReturnButton.tsx';
import { ConfirmCloseCallModal } from '../../ConfirmCloseCallModal.tsx';

export const CallFooterActions: React.FC = () => {
  const call = useCallStore(s => s.call);
  const selectedAttendantId = useCallViewStore(s => s.selectedAttendantId);
  const viewState = useCallViewStore(s => s.viewState);
  const currentUser = useCurrentUserStore(s => s.currentUser);
  const users = useOnlineUsersStore(s => s.users);

  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [pendingHangUpParams, setPendingHangUpParams] = useState<{ attendantId: string; callId?: string } | null>(null);

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
  const isAttendant = currentCall ? currentUser?.id === currentCall.attendantId : false;
  const isCallActive = viewState === 'in-call' || viewState === 'call-interrupteded';

  const handleStartCall = () => {
    if (!currentCall) return;

    if (!isAttendant) {
      try { playNotificationChime(); } catch (err) { console.warn('Failed to play start sound:', err); }
    }

    if (currentCall.status === ('draft-lobby' as any) || currentCall.id.startsWith('draft-call-')) {
      useCallStore.getState().initiateCall(currentCall.customerId, currentCall.attendantId);
      useCallViewStore.getState().setSelectedAttendantId(null);
      return;
    }

    useCallStore.getState().updateCall(currentCall.id, { status: 'awaiting-answer' });
  };

  const handleReturnCall = () => {
    if (!currentCall) return;
    useCallStore.getState().updateCall(currentCall.id, { status: 'active' });
  };

  const handleAnswerCall = () => {
    if (!currentCall) return;
    useCallStore.getState().updateCall(currentCall.id, { status: 'active', startedAt: Date.now() });
  };

  const handleCancelCall = () => {
    if (currentCall) useCallStore.getState().cancelCall(currentCall.id);
  };

  const handleHangUp = (attendantId: string, callId?: string) => {
    if (isCallActive || isAttendant) {
      setPendingHangUpParams({ attendantId, callId });
      setIsConfirmCloseOpen(true);
    } else {
      useCallStore.getState().completeCall(attendantId, callId, isAttendant);
    }
  };

  const handleConfirmClose = () => {
    if (pendingHangUpParams) {
      useCallStore.getState().completeCall(pendingHangUpParams.attendantId, pendingHangUpParams.callId, isAttendant);
    } else if (currentCall) {
      useCallStore.getState().completeCall(currentCall.attendantId, currentCall.id, isAttendant);
    }
    setPendingHangUpParams(null);
    setIsConfirmCloseOpen(false);
  };

  const handleCancelClose = () => {
    setPendingHangUpParams(null);
    setIsConfirmCloseOpen(false);
  };

  if (viewState === 'none') return null;

  if (viewState === 'in-call') {
    return (
      <>
        <EndCallButton
          label="Finish"
          onClick={() => {
            if (currentCall) handleHangUp(currentCall.attendantId, currentCall.id);
          }}
        />
        <ConfirmCloseCallModal
          isOpen={isConfirmCloseOpen}
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
          isAttendant={isAttendant}
        />
      </>
    );
  }

  if (viewState === 'awaiting-answer' && !isAttendant) {
    return (
      <div className="flex gap-2.5 items-center">
        <CancelCallButton onClick={handleCancelCall} />
      </div>
    );
  }

  if (viewState === 'awaiting-answer' && isAttendant) {
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
