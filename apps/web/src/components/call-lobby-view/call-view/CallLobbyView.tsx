import React, { useState, useEffect, useRef } from 'react';
import { useCallViewStore, useCallStore, useCurrentUserStore, useBillingStore } from '../../../states/stores.ts';
import { InfoCard } from '../info-card/InfoCard.tsx';
import { MediaSettingsModal } from '../media-settings-modal/MediaSettingsModal.tsx';
import { BillingCalculationModal } from '../BillingCalculationModal.tsx';
import { BillingSummaryModal } from '../BillingSummaryModal.tsx';
import { CallView, CallViewState } from './CallView.tsx';
import { useScreenShare } from '@daily-co/daily-react';


export const CallLobbyView: React.FC = () => {
  const call = useCallStore((s) => s.call);
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const persistedViewState = useCallViewStore((s) => s.viewState);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const currentCall = call;

  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const isCallActive = !!call;

  // Elapsed timer
  useEffect(() => {
    if (!currentCall) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const clamped = diff >= 0 ? diff : 0;
      setSeconds(clamped);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentCall?.id, isCallActive]);

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

  // Exit fullscreen when the call ends (billing modals are driven by the
  // callCompleted/meetingEnded store actions in response to their websocket events)
  const isCallActiveRef = useRef(isCallActive);

  useEffect(() => {
    const wasActive = isCallActiveRef.current;
    isCallActiveRef.current = isCallActive;

    if (wasActive && !isCallActive) {
      exitFullscreen();
    }
  }, [isCallActive]);

  useEffect(() => {
    useBillingStore.getState().closeSummaryModal();
    useBillingStore.getState().closeCalculationModal();
  }, [currentUser?.id]);

  const getCallViewState = (): CallViewState => {
    switch (persistedViewState) {
      case 'lobby': return CallViewState.Lobby;
      case 'awaiting-answer': return CallViewState.AwaitingAnswer;
      case 'awaiting-to-answer': return CallViewState.AwaitingToAnswer;
      case 'in-call': return CallViewState.InCall;
      case 'none':
      default: return CallViewState.None;
    }
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
          <h4 className="text-[10px] font-bold font-mono tracking-wider text-brand-dark uppercase">SANDBOX</h4>
        </div>
      </div>
      <div className="relative z-10 flex flex-col gap-5 mt-6">

        <InfoCard />

        <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen bg-[#0c0d0e]' : 'relative'}>
          <CallView
            state={viewState}
            isScreenSharing={isSharingScreen}
            onToggleScreenShare={() => isSharingScreen ? stopScreenShare() : startScreenShare()}
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

          <BillingCalculationModal isAttendant={currentUser?.role === 'attendant'} />

          <BillingSummaryModal />
        </div>

      </div>
    </div>
  );
};
