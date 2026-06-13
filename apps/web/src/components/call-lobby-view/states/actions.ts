/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallViewStateData, ViewState } from './state.ts';

export interface CallViewStateActions {
  setViewState: (viewState: ViewState) => void;
  setSelectedAttendantId: (id: string | null) => void;

  setIsMuted: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsVideoOff: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsScreenSharing: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsFullscreen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsSettingsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;

  setDevices: (devices: MediaDeviceInfo[]) => void;
  setSelectedCamera: (camera: string) => void;
  setSelectedMic: (mic: string) => void;
  setSelectedSpeaker: (speaker: string) => void;
  setSoundTesting: (testing: boolean) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  setCameraError: (error: string | null) => void;

  resetCallViewState: () => void;
}

export const createCallViewStateActions = (
  set: (arg: Partial<CallViewStateData> | ((state: CallViewStateData) => Partial<CallViewStateData>)) => void
): CallViewStateActions => ({
  setViewState: (viewState) => set({ viewState }),
  setSelectedAttendantId: (selectedAttendantId) => set({ selectedAttendantId }),

  setIsMuted: (arg) => set((state) => ({
    isMuted: typeof arg === 'function' ? arg(state.isMuted) : arg,
  })),
  setIsVideoOff: (arg) => set((state) => ({
    isVideoOff: typeof arg === 'function' ? arg(state.isVideoOff) : arg,
  })),
  setIsScreenSharing: (arg) => set((state) => ({
    isScreenSharing: typeof arg === 'function' ? arg(state.isScreenSharing) : arg,
  })),
  setIsFullscreen: (arg) => set((state) => ({
    isFullscreen: typeof arg === 'function' ? arg(state.isFullscreen) : arg,
  })),
  setIsSettingsOpen: (arg) => set((state) => ({
    isSettingsOpen: typeof arg === 'function' ? arg(state.isSettingsOpen) : arg,
  })),

  setDevices: (devices) => set({ devices }),
  setSelectedCamera: (selectedCamera) => set({ selectedCamera }),
  setSelectedMic: (selectedMic) => set({ selectedMic }),
  setSelectedSpeaker: (selectedSpeaker) => set({ selectedSpeaker }),
  setSoundTesting: (soundTesting) => set({ soundTesting }),
  setCameraStream: (cameraStream) => set({ cameraStream }),
  setCameraError: (cameraError) => set({ cameraError }),

  resetCallViewState: () => set({
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    isFullscreen: false,
    isSettingsOpen: false,
    soundTesting: false,
    cameraStream: null,
    cameraError: null,
  }),
});
