import { create } from "zustand";
import { DevicesStateData, MediaDeviceOption, initialDevicesState } from "./state.ts";
import { DevicesActions, createDevicesActions } from "./actions.ts";

interface DevicesSetters {
  setCameras: (cameras: MediaDeviceOption[]) => void;
  setMicrophones: (microphones: MediaDeviceOption[]) => void;
  setSpeakers: (speakers: MediaDeviceOption[]) => void;
  setSelectedCamera: (deviceId: string) => void;
  setSelectedMicrophone: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
}

export type DevicesStoreInstance = ReturnType<typeof createDevicesStore>;

export const createDevicesStore = () => create<DevicesStateData & DevicesActions & DevicesSetters>((set, get) => ({
  ...initialDevicesState,
  ...createDevicesActions(set, get),

  setCameras: (cameras) => set({ cameras }),
  setMicrophones: (microphones) => set({ microphones }),
  setSpeakers: (speakers) => set({ speakers }),
  setSelectedCamera: (deviceId) => set({ selectedCamera: deviceId }),
  setSelectedMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
  setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),
}));

export const useDevicesStore = createDevicesStore();
