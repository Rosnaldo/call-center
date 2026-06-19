import React from 'react';
import { CallViewState } from '../call-view/CallView.tsx';
import { MicToggleButton } from './MicToggleButton.tsx';
import { CamToggleButton } from './CamToggleButton.tsx';
import { ScreenShareToggleButton } from './ScreenShareToggleButton.tsx';
import { SettingsButton } from './SettingsButton.tsx';
import { FullscreenToggleButton } from './FullscreenToggleButton.tsx';
import { CallFooterActions } from './CallFooterActions/CallFooterActions.tsx';

interface CallFooterProps {
  state: CallViewState;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isVideoOff: boolean;
  setIsVideoOff: React.Dispatch<React.SetStateAction<boolean>>;
  isScreenSharing: boolean;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: (value: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const CallFooter: React.FC<CallFooterProps> = ({
  state,
  isMuted,
  setIsMuted,
  isVideoOff,
  setIsVideoOff,
  isScreenSharing,
  setIsScreenSharing,
  setIsSettingsOpen,
  isFullscreen,
  toggleFullscreen,
}) => {
  const showCallControls = state === CallViewState.InCall;

  return (
    <div className="bg-[#17191b] p-4 border-t border-[#222528] flex justify-center items-center gap-4">
      <MicToggleButton
        isMuted={isMuted}
        onClick={() => setIsMuted(prev => !prev)}
      />

      <CamToggleButton
        isVideoOff={isVideoOff}
        onClick={() => setIsVideoOff(prev => !prev)}
      />

      {showCallControls && (
        <ScreenShareToggleButton
          isCallActive
          isScreenSharing={isScreenSharing}
          onClick={() => setIsScreenSharing(prev => !prev)}
        />
      )}

      <SettingsButton onClick={() => setIsSettingsOpen(true)} />

      {showCallControls && (
        <FullscreenToggleButton
          isFullscreen={isFullscreen}
          onClick={toggleFullscreen}
        />
      )}

      <CallFooterActions />
    </div>
  );
};
