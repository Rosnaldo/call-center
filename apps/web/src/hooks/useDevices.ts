import { useState, useEffect, useCallback } from "react";
import { DailyService } from "../services/daily.ts";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export type PermissionState = "prompt" | "granted" | "denied";

async function queryPermission(name: "camera" | "microphone"): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state as PermissionState;
  } catch {
    return "prompt";
  }
}

export function useDevices() {
  const [detectedCameras, setDetectedCameras] = useState<MediaDeviceOption[]>([]);
  const [detectedMicrophones, setDetectedMicrophones] = useState<MediaDeviceOption[]>([]);
  const [detectedSpeakers, setDetectedSpeakers] = useState<MediaDeviceOption[]>([]);
  const [camera, setCamera] = useState("");
  const [microphone, setMicrophone] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [cameraPermission, setCameraPermission] = useState<PermissionState>("prompt");
  const [micPermission, setMicPermission] = useState<PermissionState>("prompt");
  const [cameraOn, setCameraOn] = useState(true);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const toggleCamera = useCallback(() => {
    setCameraOn((prev) => {
      const next = !prev;
      DailyService.getInstance().callObject.setLocalVideo(next);
      return next;
    });
  }, []);

  const toggleMicrophone = useCallback(() => {
    setMicrophoneOn((prev) => {
      const next = !prev;
      DailyService.getInstance().callObject.setLocalAudio(next);
      return next;
    });
  }, []);

  const populateDevices = useCallback(async (stream?: MediaStream) => {
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

    setDetectedCameras(videoInputs);
    setDetectedMicrophones(audioInputs);
    setDetectedSpeakers(audioOutputs);

    if (videoInputs.length) setCamera((prev) => prev || videoInputs[0].deviceId);
    if (audioInputs.length) setMicrophone((prev) => prev || audioInputs[0].deviceId);
    if (audioOutputs.length) setSpeaker((prev) => prev || audioOutputs[0].deviceId);

    if (stream) stream.getTracks().forEach((t) => t.stop());
  }, []);

  const syncPermissions = useCallback(async () => {
    const [cam, mic] = await Promise.all([
      queryPermission("camera"),
      queryPermission("microphone"),
    ]);
    setCameraPermission(cam);
    setMicPermission(mic);
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
    detectedCameras,
    detectedMicrophones,
    detectedSpeakers,
    camera,
    microphone,
    speaker,
    setCamera,
    setMicrophone,
    setSpeaker,
    cameraPermission,
    micPermission,
    requestCamera,
    requestMicrophone,
    cameraOn,
    microphoneOn,
    toggleCamera,
    toggleMicrophone
  };
}
