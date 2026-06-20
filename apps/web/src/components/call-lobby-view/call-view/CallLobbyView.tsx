import React, { useState, useEffect, useRef } from 'react';
import { useCallViewStore } from '../../../states/call-view/store.ts';
import { useCallStore } from '../../../states/call/store.ts';
import { useCurrentUserStore } from '../../../states/current-user/store.ts';
import { useOnlineUsersStore } from '../../../states/online-users/store.ts';
import { InfoCard } from '../info-card/InfoCard.tsx';
import { MediaSettingsModal } from '../MediaSettingsModal.tsx';
import { BillingCalculationModal } from '../BillingCalculationModal.tsx';
import { BillingSummaryModal } from '../BillingSummaryModal.tsx';
import { CallView, CallViewState } from './CallView.tsx';
import { CallState } from '@/src/states/call/state.ts';
import { useIncomingCallStore } from '../../../states/incoming-call/store.ts';


export const CallLobbyView: React.FC = () => {
  const call = useCallStore((s) => s.call);
  const incomingCall = useIncomingCallStore((s) => s.incomingCall);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const users = useOnlineUsersStore((s) => s.users);
  const selectedAttendantId = useCallViewStore((s) => s.selectedAttendantId);
  const persistedViewState = useCallViewStore((s) => s.viewState);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [billingCountdown, setBillingCountdown] = useState(10);

  const fastBilling = false;
  const blockDurationSeconds = fastBilling ? 10 : 600;

  const isCallActive = currentCall
    ? (currentCall.status === 'active' || currentCall.status === 'call-interrupteded')
    : false;

  // Elapsed timer
  useEffect(() => {
    if (!currentCall) {
      setSeconds(0);
      return;
    }
    if (currentCall.status !== 'active') return;
    const start = currentCall.startedAt || Date.now();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const clamped = diff >= 0 ? diff : 0;
      setSeconds(clamped);
      secondsRef.current = clamped;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentCall?.id, currentCall?.status, isCallActive, currentCall?.startedAt]);

  // Billing countdown
  useEffect(() => {
    if (!currentCall) {
      setBillingCountdown(blockDurationSeconds);
      return;
    }
    if (currentCall.status !== 'active') return;
    const start = currentCall.startedAt || Date.now();
    const tickBilling = () => {
      const elapsedSinceStart = Date.now() - start;
      const tokensChargedCount = currentCall.tokensCharged || 1;
      const nextChargeDelay = tokensChargedCount * blockDurationSeconds * 1000;
      const remainingMs = nextChargeDelay - elapsedSinceStart;
      const remaining = Math.ceil(remainingMs / 1000);
      setBillingCountdown(remaining >= 0 ? remaining : 0);
    };
    tickBilling();
    const interval = setInterval(tickBilling, 1000);
    return () => clearInterval(interval);
  }, [currentCall?.id, currentCall?.status, isCallActive, currentCall?.tokensCharged, currentCall?.startedAt, blockDurationSeconds]);

  // Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const nextVal = !isFullscreen;
    setIsFullscreen(nextVal);
    if (!containerRef.current) return;
    const doc = document as any;
    const element = containerRef.current as any;
    try {
      const isCurrent = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (nextVal && !isCurrent) {
        if (element.requestFullscreen) await element.requestFullscreen();
        else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
        else if (element.mozRequestFullScreen) await element.mozRequestFullScreen();
        else if (element.msRequestFullscreen) await element.msRequestFullscreen();
      } else if (!nextVal && isCurrent) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      const doc = document as any;
      const isCurrent = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      if (isCurrent) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      }
    } catch (err) {
      console.warn('Failed to exit fullscreen:', err);
    }
  };

  // Billing summary
  const [completedCallSummary, setCompletedCallSummary] = useState<CallState | null>(null);
  const [isCalculatingTokens, setIsCalculatingTokens] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const secondsRef = useRef(0);

  const isCallActiveRef = useRef(isCallActive);
  const lastCallRef = useRef<CallState | null>(null);

  const resetSignal = useCallStore((s) => s.resetSignal);
  const resetSignalRef = useRef(resetSignal);

  if (currentCall && isCallActive) lastCallRef.current = currentCall;

  useEffect(() => {
    const wasActive = isCallActiveRef.current;
    isCallActiveRef.current = isCallActive;

    if (wasActive && !isCallActive && lastCallRef.current) {
      if (resetSignalRef.current !== resetSignal) {
        resetSignalRef.current = resetSignal;
        lastCallRef.current = null;
        return;
      }
      exitFullscreen();
      setCallDurationSeconds(secondsRef.current);

      const endedCallId = lastCallRef.current.id;
      const endedCall = lastCallRef.current;
      lastCallRef.current = null;

      setIsCalculatingTokens(true);

      const timeoutId = setTimeout(() => {
        const storeCall = useCallStore.getState().call;
        const finalCall = storeCall?.id === endedCallId && storeCall.status === 'completed'
          ? storeCall
          : null;
        setCompletedCallSummary(finalCall ?? { ...endedCall, status: 'completed' });
        setIsCalculatingTokens(false);
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [isCallActive, resetSignal]);

  useEffect(() => {
    setCompletedCallSummary(null);
    setIsCalculatingTokens(false);
  }, [currentUser?.id]);

  const customerUser = currentCall ? users.find(u => u.id === currentCall.customerId) : null;
  const currentTokens = customerUser?.tokens ?? 0;

  const getCallViewState = (): CallViewState => {
    if (persistedViewState === 'awaiting-answer') return CallViewState.AwaitingAnswer;
    if (!currentCall && !incomingCall) return CallViewState.None;
    return isCallActive ? CallViewState.InCall : CallViewState.Lobby;
  };
  const viewState = getCallViewState();

  const attendantName = currentCall?.attendantName || '';

  const formatTimer = (totSeconds: number) => {
    const mins = Math.floor(totSeconds / 60);
    const secs = totSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="call-lobby-view"
      className="bg-white text-brand-dark p-6 relative border border-brand-border transition-all duration-300 rounded-3xl overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-brand-border-dark pb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-ochre rounded-full" />
          <h4 className="text-[10px] font-bold font-mono tracking-wider text-brand-dark uppercase">YOUR SANDBOX</h4>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-5 mt-6">

        <InfoCard
          currentCall={currentCall}
          currentTokens={currentTokens}
          blockDurationSeconds={blockDurationSeconds}
          billingCountdown={billingCountdown}
          isInCall={viewState === CallViewState.InCall}
        />

        <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#0c0d0e]' : 'relative'}>
          <CallView
            state={viewState}
            isScreenSharing={isScreenSharing}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            setIsVideoOff={setIsVideoOff}
            setIsScreenSharing={setIsScreenSharing}
            setIsSettingsOpen={setIsSettingsOpen}
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            currentCall={currentCall}
            timerText={isCallActive ? formatTimer(seconds) : undefined}
            attendantName={attendantName}
          />

          <MediaSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />

          <BillingCalculationModal isOpen={isCalculatingTokens} isAttendant={currentUser?.role === 'attendant'} />

          <BillingSummaryModal
            isOpen={!!completedCallSummary}
            completedCallSummary={completedCallSummary}
            currentUser={currentUser}
            callDurationSeconds={callDurationSeconds}
            onClose={() => setCompletedCallSummary(null)}
          />
        </div>

      </div>
    </div>
  );
};
