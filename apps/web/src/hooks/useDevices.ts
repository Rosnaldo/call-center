import { useEffect, useCallback } from "react";
import { useDevicesStore } from "../states/stores";

export function useDevices() {
  const store = useDevicesStore();

  const enumerateDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));

      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` }));

      const audioOutputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }));

      const state = useDevicesStore.getState();

      state.setCameras(videoInputs);
      state.setMicrophones(audioInputs);
      state.setSpeakers(audioOutputs);

      if (videoInputs.length && !state.selectedCamera) state.setSelectedCamera(videoInputs[0].deviceId);
      if (audioInputs.length && !state.selectedMicrophone) state.setSelectedMicrophone(audioInputs[0].deviceId);
      if (audioOutputs.length && !state.selectedSpeaker) state.setSelectedSpeaker(audioOutputs[0].deviceId);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
  }, [enumerateDevices]);

  return store;
}
