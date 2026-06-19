import React from 'react';
import { CallState } from '@/src/states/call/state.ts';
import { CallViewport } from './CallViewport.tsx';
import { CallFooter } from '../call-footer/CallFooter.tsx';

export enum CallViewState {
  None = 'none',
  Lobby = 'lobby',
  AwaitingAnswer = 'awaiting-answer',
  InCall = 'in-call',
}

interface CallViewProps {
  state: CallViewState;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsVideoOff: React.Dispatch<React.SetStateAction<boolean>>;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: (value: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  currentCall?: CallState;
  timerText?: string;
  attendantName?: string;
  queueCount?: number;
}

export const CallView: React.FC<CallViewProps> = ({
  state,
  isScreenSharing,
  isVideoOff,
  isMuted,
  setIsMuted,
  setIsVideoOff,
  setIsScreenSharing,
  setIsSettingsOpen,
  isFullscreen,
  toggleFullscreen,
  currentCall,
  timerText,
  attendantName,
  queueCount,
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
        timerText={timerText}
        attendantName={attendantName}
        queueCount={queueCount}
        currentCall={currentCall}
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
      />
    </div>
  );
};
