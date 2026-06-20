import type { DailyCall } from "@daily-co/daily-js";
import { DevicesStateData } from "./state.ts";

export interface DevicesActions {
  toggleCamera: (daily: DailyCall | null) => void;
  toggleMicrophone: (daily: DailyCall | null) => void;
}

export const createDevicesActions = (
  set: (arg: Partial<DevicesStateData> | ((state: DevicesStateData) => Partial<DevicesStateData>)) => void,
  get: () => DevicesStateData,
): DevicesActions => ({
  toggleCamera: (daily) => {
    const next = !get().cameraOn;
    set({ cameraOn: next });
    daily?.setLocalVideo(next);
  },

  toggleMicrophone: (daily) => {
    const next = !get().microphoneOn;
    set({ microphoneOn: next });
    daily?.setLocalAudio(next);
  },
});
