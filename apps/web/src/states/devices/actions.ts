import { useDailyStore } from "../daily/store.ts";
import { DevicesStateData } from "./state.ts";

export interface DevicesActions {
  toggleCamera: () => void;
  toggleMicrophone: () => void;
}

export const createDevicesActions = (
  set: (arg: Partial<DevicesStateData> | ((state: DevicesStateData) => Partial<DevicesStateData>)) => void,
  get: () => DevicesStateData,
): DevicesActions => ({
  toggleCamera: () => {
    const next = !get().cameraOn;
    set({ cameraOn: next });
    useDailyStore.getState().daily?.setLocalVideo(next);
  },

  toggleMicrophone: () => {
    const next = !get().microphoneOn;
    set({ microphoneOn: next });
    useDailyStore.getState().daily?.setLocalAudio(next);
  },
});
