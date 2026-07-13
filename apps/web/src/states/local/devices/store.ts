import { create } from 'zustand';

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export type PermissionState = 'prompt' | 'granted' | 'denied';

export interface DevicesState {
  detectedCameras: MediaDeviceOption[];
  detectedMicrophones: MediaDeviceOption[];
  detectedSpeakers: MediaDeviceOption[];
  camera: string;
  microphone: string;
  speaker: string;
  cameraPermission: PermissionState;
  micPermission: PermissionState;
  cameraOn: boolean;
  microphoneOn: boolean;
  cameraDailycoOn: boolean;
  microphoneDailycoOn: boolean;
}

export interface DevicesActions {
  setDetectedCameras: (cameras: MediaDeviceOption[]) => void;
  setDetectedMicrophones: (microphones: MediaDeviceOption[]) => void;
  setDetectedSpeakers: (speakers: MediaDeviceOption[]) => void;
  setCamera: (deviceId: string) => void;
  setMicrophone: (deviceId: string) => void;
  setSpeaker: (deviceId: string) => void;
  setCameraPermission: (state: PermissionState) => void;
  setMicPermission: (state: PermissionState) => void;
  setCameraOn: (on: boolean) => void;
  setMicrophoneOn: (on: boolean) => void;
  setCameraDailycoOn: (on: boolean) => void;
  setMicrophoneDailycoOn: (on: boolean) => void;
}

export const createDevicesStore = () => create<DevicesState & DevicesActions>((set) => ({
  detectedCameras: [],
  detectedMicrophones: [],
  detectedSpeakers: [],
  camera: '',
  microphone: '',
  speaker: '',
  cameraPermission: 'prompt',
  micPermission: 'prompt',
  cameraOn: false,
  microphoneOn: false,
  cameraDailycoOn: false,
  microphoneDailycoOn: false,

  setDetectedCameras: (cameras) => set({ detectedCameras: cameras }),
  setDetectedMicrophones: (microphones) => set({ detectedMicrophones: microphones }),
  setDetectedSpeakers: (speakers) => set({ detectedSpeakers: speakers }),
  setCamera: (deviceId) => set({ camera: deviceId }),
  setMicrophone: (deviceId) => set({ microphone: deviceId }),
  setSpeaker: (deviceId) => set({ speaker: deviceId }),
  setCameraPermission: (state) => set({ cameraPermission: state }),
  setMicPermission: (state) => set({ micPermission: state }),
  setCameraOn: (on) => set({ cameraOn: on }),
  setMicrophoneOn: (on) => set({ microphoneOn: on }),
  setCameraDailycoOn: (on) => set({ cameraDailycoOn: on }),
  setMicrophoneDailycoOn: (on) => set({ microphoneDailycoOn: on }),
}));
