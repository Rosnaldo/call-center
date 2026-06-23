import { useState, useRef, useEffect } from "react";
import type { PermissionState } from "./useDevices";

interface UseMediaTestProps {
  cameraPermission: PermissionState;
  micPermission: PermissionState;
  cameraId: string;
  micId: string;
  cameraOn: boolean;
  microphoneOn: boolean;
}

export function useMediaTest({ cameraPermission, micPermission, cameraId, micId, cameraOn, microphoneOn }: UseMediaTestProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const wantCamera = cameraPermission === "granted" && cameraOn;
  const wantMic = micPermission === "granted" && microphoneOn;

  useEffect(() => {
    if (!wantCamera && !wantMic) {
      if (videoRef.current) videoRef.current.srcObject = null;
      setMicLevel(0);
      return;
    }

    let animFrame = 0;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let cancelled = false;

    async function start() {
      try {
        const constraints: MediaStreamConstraints = {};
        if (wantCamera) constraints.video = cameraId ? { deviceId: { exact: cameraId } } : true;
        if (wantMic) constraints.audio = micId ? { deviceId: { exact: micId } } : true;

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = wantCamera ? stream : null;
        }

        if (wantMic) {
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (cancelled) return;
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrame = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        } else {
          setMicLevel(0);
        }
      } catch {
        // device unavailable
      }
    }

    start();

    return () => {
      cancelled = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
      if (videoRef.current) videoRef.current.srcObject = null;
      setMicLevel(0);
    };
  }, [wantCamera, wantMic, cameraId, micId]);

  return { videoRef, micLevel };
}
