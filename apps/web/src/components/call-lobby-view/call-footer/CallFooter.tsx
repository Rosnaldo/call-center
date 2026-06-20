import React from 'react';
import { useDaily } from '@daily-co/daily-react';
import { CallViewState } from '../call-view/CallView.tsx';
import { useDevicesStore } from '../../../states/devices/store.ts';
import { MicToggleButton } from './MicToggleButton.tsx';
import { CamToggleButton } from './CamToggleButton.tsx';
import { ScreenShareToggleButton } from './ScreenShareToggleButton.tsx';
import { SettingsButton } from './SettingsButton.tsx';
import { FullscreenToggleButton } from './FullscreenToggleButton.tsx';
import { CallFooterActions } from './CallFooterActions/CallFooterActions.tsx';

interface CallFooterProps {
  state: CallViewState;
  isScreenSharing: boolean;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: (value: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const CallFooter: React.FC<CallFooterProps> = ({
  state,
  isScreenSharing,
  setIsScreenSharing,
  setIsSettingsOpen,
  isFullscreen,
  toggleFullscreen,
}) => {
  const daily = useDaily();
  const cameraOn = useDevicesStore(s => s.cameraOn);
  const microphoneOn = useDevicesStore(s => s.microphoneOn);
  const toggleCamera = useDevicesStore(s => s.toggleCamera);
  const toggleMicrophone = useDevicesStore(s => s.toggleMicrophone);

  const showCallControls = state === CallViewState.InCall;

  return (
    <div className="bg-[#17191b] p-4 border-t border-[#222528] flex justify-center items-center gap-4">
      <MicToggleButton
        isMuted={!microphoneOn}
        onClick={() => toggleMicrophone(daily)}
      />

      <CamToggleButton
        isVideoOff={!cameraOn}
        onClick={() => toggleCamera(daily)}
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
