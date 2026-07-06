import React from 'react';
import { useDevicesContext } from '../../../providers/devices.tsx';
import { useChatStore } from '../../../states/stores.ts';
import { CallViewState } from '../call-view/CallView.tsx';
import { MicToggleButton } from './MicToggleButton.tsx';
import { CamToggleButton } from './CamToggleButton.tsx';
import { ScreenShareToggleButton } from './ScreenShareToggleButton.tsx';
import { SettingsButton } from './SettingsButton.tsx';
import { FullscreenToggleButton } from './FullscreenToggleButton.tsx';
import { ChatToggleButton } from './ChatToggleButton.tsx';
import { CallFooterActions } from './CallFooterActions/CallFooterActions.tsx';

interface CallFooterProps {
  state: CallViewState;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  setIsSettingsOpen: (value: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const CallFooter: React.FC<CallFooterProps> = ({
  state,
  isScreenSharing,
  onToggleScreenShare,
  setIsSettingsOpen,
  isFullscreen,
  toggleFullscreen,
}) => {
  const { cameraOn, microphoneOn, toggleCamera, toggleMicrophone } = useDevicesContext();
  const isChatOpen = useChatStore(s => s.isOpen);
  const showCallControls = state === CallViewState.InCall;

  const handleToggleChat = () => {
    if (isChatOpen) {
      useChatStore.getState().closeChat();
      return;
    }
    useChatStore.getState().openChat();
    useChatStore.getState().fetchChatMessages();
  };

  return (
    <div className="bg-[#17191b] p-4 border-t border-[#222528] flex justify-center items-center gap-4">
      <MicToggleButton
        isMuted={!microphoneOn}
        onClick={toggleMicrophone}
      />

      <CamToggleButton
        isVideoOff={!cameraOn}
        onClick={toggleCamera}
      />

      {showCallControls && (
        <ScreenShareToggleButton
          isCallActive
          isScreenSharing={isScreenSharing}
          onClick={onToggleScreenShare}
        />
      )}

      <SettingsButton onClick={() => setIsSettingsOpen(true)} />

      {showCallControls && (
        <ChatToggleButton
          isOpen={isChatOpen}
          onClick={handleToggleChat}
        />
      )}

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
