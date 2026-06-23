import { useEffect, useCallback } from "react";
import { DailyService } from "../services/daily.ts";
import { useDevicesStore } from "../states/stores.ts";
import type { PermissionState } from "../states/devices/store.ts";

export type { MediaDeviceOption, PermissionState } from "../states/devices/store.ts";

async function queryPermission(name: "camera" | "microphone"): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state as PermissionState;
  } catch {
    return "prompt";
  }
}

export function useSyncDevices() {
  const store = useDevicesStore();

  const toggleCamera = useCallback(() => {
    const next = !useDevicesStore.getState().cameraOn;
    useDevicesStore.getState().setCameraOn(next);
    DailyService.getInstance().callObject.setLocalVideo(next);
  }, []);

  const toggleMicrophone = useCallback(() => {
    const next = !useDevicesStore.getState().microphoneOn;
    useDevicesStore.getState().setMicrophoneOn(next);
    DailyService.getInstance().callObject.setLocalAudio(next);
  }, []);

  const populateDevices = useCallback(async (stream?: MediaStream) => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const s = useDevicesStore.getState();

    const videoInputs = devices
      .filter((d) => d.kind === "videoinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));

    const audioInputs = devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 5)}` }));

    const audioOutputs = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }));

    s.setDetectedCameras(videoInputs);
    s.setDetectedMicrophones(audioInputs);
    s.setDetectedSpeakers(audioOutputs);

    if (videoInputs.length && !s.camera) s.setCamera(videoInputs[0].deviceId);
    if (audioInputs.length && !s.microphone) s.setMicrophone(audioInputs[0].deviceId);
    if (audioOutputs.length && !s.speaker) s.setSpeaker(audioOutputs[0].deviceId);

    if (stream) stream.getTracks().forEach((t) => t.stop());
  }, []);

  const syncPermissions = useCallback(async () => {
    const [cam, mic] = await Promise.all([
      queryPermission("camera"),
      queryPermission("microphone"),
    ]);
    const s = useDevicesStore.getState();
    s.setCameraPermission(cam);
    s.setMicPermission(mic);
    return { cam, mic };
  }, []);

  const requestCamera = useCallback(async () => {
    const perms = await syncPermissions();
    if (perms.cam === "denied") return "denied" as const;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      await populateDevices(stream);
      await syncPermissions();
      return "granted" as const;
    } catch {
      await syncPermissions();
      return "denied" as const;
    }
  }, [populateDevices, syncPermissions]);

  const requestMicrophone = useCallback(async () => {
    const perms = await syncPermissions();
    if (perms.mic === "denied") return "denied" as const;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await populateDevices(stream);
      await syncPermissions();
      return "granted" as const;
    } catch {
      await syncPermissions();
      return "denied" as const;
    }
  }, [populateDevices, syncPermissions]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    async function onPermissionChange() {
      const perms = await syncPermissions();
      if (perms.cam === "granted" || perms.mic === "granted") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: perms.cam === "granted",
            audio: perms.mic === "granted",
          });
          await populateDevices(stream);
        } catch {
          await populateDevices();
        }
      }
    }

    async function watchPermission(name: "camera" | "microphone") {
      try {
        const status = await navigator.permissions.query({ name: name as PermissionName });
        const handler = () => { onPermissionChange(); };
        status.addEventListener("change", handler);
        cleanups.push(() => status.removeEventListener("change", handler));
      } catch {
        // browser doesn't support querying this permission
      }
    }

    onPermissionChange();
    watchPermission("camera");
    watchPermission("microphone");

    const onDeviceChange = () => {
      syncPermissions().then(() => populateDevices());
    };
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    cleanups.push(() => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange));

    return () => cleanups.forEach((fn) => fn());
  }, [populateDevices, syncPermissions]);

  return {
    ...store,
    toggleCamera,
    toggleMicrophone,
    requestCamera,
    requestMicrophone,
  };
}
