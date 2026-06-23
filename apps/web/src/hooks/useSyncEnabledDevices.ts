import { useEffect } from "react";
import { DailyService } from "../services/daily.ts";
import { useDevicesStore } from "../states/stores.ts";

export function useSyncEnabledDevices() {
  const cameraOn = useDevicesStore((s) => s.cameraOn);
  const microphoneOn = useDevicesStore((s) => s.microphoneOn);

  useEffect(() => {
    useDevicesStore.getState().setCameraDailycoOn(cameraOn);
    DailyService.getInstance().callObject.setLocalVideo(cameraOn);
  }, [cameraOn]);

  useEffect(() => {
    useDevicesStore.getState().setMicrophoneDailycoOn(microphoneOn);
    DailyService.getInstance().callObject.setLocalAudio(microphoneOn);
  }, [microphoneOn]);
}
