import React from 'react';
import { CallState } from '@/src/states/call/state.ts';
import { CallViewport } from './CallViewport.tsx';
import { CallFooter } from '../call-footer/CallFooter.tsx';

export enum CallViewState {
  None = 'none',
  Lobby = 'lobby',
  InCall = 'in-call',
}

interface CallViewProps {
  state: CallViewState;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  partnerName: string;
  partnerInitials: string;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsVideoOff: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: (value: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  handleStartCall: () => void;
  onHangUp: (attendantId: string, callId?: string) => void;
  currentCall?: CallState;
  timerText?: string;
  attendantName?: string;
  queueCount?: number;
  attendantAvatarUrl?: string;
  isAttendant?: boolean;
}

export const CallView: React.FC<CallViewProps> = ({
  state,
  isScreenSharing,
  isVideoOff,
  isMuted,
  partnerName,
  partnerInitials,
  setIsMuted,
  setIsVideoOff,
  setIsScreenSharing,
  setIsSettingsOpen,
  isFullscreen,
  toggleFullscreen,
  handleStartCall,
  onHangUp,
  currentCall,
  timerText,
  attendantName,
  queueCount,
  attendantAvatarUrl,
  isAttendant,
}) => {
  return (
    <div className={`bg-[#0c0d0e] overflow-hidden relative flex flex-col justify-between animate-fade-in ${
      isFullscreen
        ? 'fixed inset-0 z-[100] rounded-none w-screen h-screen'
        : 'rounded-2xl border border-[#222528] min-h-[360px] md:min-h-[440px]'
    }`}>
      <CallViewport
        state={state}
        isScreenSharing={isScreenSharing}
        isVideoOff={isVideoOff}
        isMuted={isMuted}
        partnerName={partnerName}
        partnerInitials={partnerInitials}
        timerText={timerText}
        attendantName={attendantName}
        queueCount={queueCount}
        attendantAvatarUrl={attendantAvatarUrl}
        currentCall={currentCall}
        isAttendant={isAttendant}
      />
      <CallFooter
        state={state}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isVideoOff={isVideoOff}
        setIsVideoOff={setIsVideoOff}
        isScreenSharing={isScreenSharing}
        setIsScreenSharing={setIsScreenSharing}
        setIsSettingsOpen={setIsSettingsOpen}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        handleStartCall={handleStartCall}
        onHangUp={onHangUp}
        currentCall={currentCall}
        isAttendant={isAttendant}
      />
    </div>
  );
};
