export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export interface DevicesStateData {
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  speakers: MediaDeviceOption[];

  selectedCamera: string;
  selectedMicrophone: string;
  selectedSpeaker: string;

  cameraOn: boolean;
  microphoneOn: boolean;
}

export const initialDevicesState: DevicesStateData = {
  cameras: [],
  microphones: [],
  speakers: [],

  selectedCamera: "",
  selectedMicrophone: "",
  selectedSpeaker: "",

  cameraOn: true,
  microphoneOn: true,
};
