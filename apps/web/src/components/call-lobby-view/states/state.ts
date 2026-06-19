/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ViewState =
  | 'none'
  | 'lobby'
  | 'in-call'
  | 'call-interrupteded';

export interface CallViewStateData {
  viewState: ViewState;
  selectedAttendantId: string | null;

  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isFullscreen: boolean;
  isSettingsOpen: boolean;

  devices: MediaDeviceInfo[];
  selectedCamera: string;
  selectedMic: string;
  selectedSpeaker: string;
  soundTesting: boolean;
  cameraStream: MediaStream | null;
  cameraError: string | null;
}

export const initialCallViewState: CallViewStateData = {
  viewState: 'none',
  selectedAttendantId: null,

  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  isFullscreen: false,
  isSettingsOpen: false,

  devices: [],
  selectedCamera: 'built-in-cam',
  selectedMic: 'built-in-mic',
  selectedSpeaker: 'built-in-spk',
  soundTesting: false,
  cameraStream: null,
  cameraError: null,
};
