import React from 'react';
import { CallState } from '@/src/states/call/state.ts';
import { CallViewState } from '../call-view/CallView.tsx';
import { MicToggleButton } from './MicToggleButton.tsx';
import { CamToggleButton } from './CamToggleButton.tsx';
import { ScreenShareToggleButton } from './ScreenShareToggleButton.tsx';
import { SettingsButton } from './SettingsButton.tsx';
import { FullscreenToggleButton } from './FullscreenToggleButton.tsx';
import { StartCallButton } from './StartCallButton.tsx';
import { EndCallButton } from './EndCallButton.tsx';

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
  handleStartCall: () => void;
  onHangUp: (attendantId: string, callId?: string) => void;
  currentCall?: CallState;
  isAttendant?: boolean;
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
  handleStartCall,
  onHangUp,
  currentCall,
  isAttendant,
}) => {
  const isCallActive = state === CallViewState.InCall;
  const isAwaiting = currentCall?.status === 'awaiting-answer';

  return (
    <div className="bg-[#17191b] p-4 border-t border-[#222528] flex justify-center items-center gap-4">
      <MicToggleButton
        isCallActive={isCallActive}
        isMuted={isMuted}
        onClick={() => setIsMuted(prev => !prev)}
      />

      <CamToggleButton
        isCallActive={isCallActive}
        isVideoOff={isVideoOff}
        onClick={() => setIsVideoOff(prev => !prev)}
      />

      {isCallActive && (
        <ScreenShareToggleButton
          isCallActive={isCallActive}
          isScreenSharing={isScreenSharing}
          onClick={() => setIsScreenSharing(prev => !prev)}
        />
      )}

      <SettingsButton onClick={() => setIsSettingsOpen(true)} />

      {isCallActive && (
        <FullscreenToggleButton
          isFullscreen={isFullscreen}
          onClick={toggleFullscreen}
        />
      )}

      {state !== CallViewState.None && (
        !isCallActive ? (
          isAwaiting ? (
            !isAttendant ? (
              <div className="flex gap-2.5 items-center">
                <EndCallButton
                  onClick={() => {
                    if (currentCall) onHangUp(currentCall.attendantId, currentCall.id);
                  }}
                />
              </div>
            ) : (
              <div className="flex gap-2.5 items-center">
                <StartCallButton label="Atender Chamada" onClick={handleStartCall} />
                <EndCallButton
                  onClick={() => {
                    if (currentCall) onHangUp(currentCall.attendantId, currentCall.id);
                  }}
                />
              </div>
            )
          ) : (
            <StartCallButton
              label={currentCall?.status === 'call-interrupteded' ? 'Return' : 'Call'}
              onClick={handleStartCall}
            />
          )
        ) : (
          <EndCallButton
            label="Finish"
            onClick={() => {
              if (currentCall) onHangUp(currentCall.attendantId, currentCall.id);
            }}
          />
        )
      )}
    </div>
  );
};
