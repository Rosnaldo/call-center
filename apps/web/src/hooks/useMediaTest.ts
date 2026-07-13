import { useState, useRef, useEffect, useCallback } from "react";
import type { PermissionState } from "../states/local/devices/store";

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
  const [running, setRunning] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef(0);

  const wantCamera = cameraPermission === "granted" && cameraOn;
  const wantMic = micPermission === "granted" && microphoneOn;

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    if (!running || (!wantCamera && !wantMic)) {
      cleanup();
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        const constraints: MediaStreamConstraints = {};
        if (wantCamera) constraints.video = cameraId ? { deviceId: { exact: cameraId } } : true;
        if (wantMic) constraints.audio = micId ? { deviceId: { exact: micId } } : true;

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = wantCamera ? stream : null;
        }

        if (wantMic) {
          const audioCtx = new AudioContext();
          audioCtxRef.current = audioCtx;
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
            animFrameRef.current = requestAnimationFrame(updateLevel);
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
      cleanup();
    };
  }, [running, wantCamera, wantMic, cameraId, micId, cleanup]);

  const startTest = useCallback(() => setRunning(true), []);
  const stopTest = useCallback(() => {
    setRunning(false);
    cleanup();
  }, [cleanup]);

  return { videoRef, micLevel, running, startTest, stopTest };
}
