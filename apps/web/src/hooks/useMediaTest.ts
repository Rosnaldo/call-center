import { useState, useRef, useCallback, useEffect } from "react";
import { useDevicesStore } from "../states/devices/store";

export function useMediaTest() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const testSoundCtxRef = useRef<AudioContext | null>(null);
  const cameraOn = useDevicesStore((s) => s.cameraOn);
  const microphoneOn = useDevicesStore((s) => s.microphoneOn);

  const stopTest = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    analyserRef.current = null;
    setMicLevel(0);
  }, []);

  const startTest = useCallback(async (cameraId: string, micId: string) => {
    stopTest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraId ? { deviceId: { exact: cameraId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });

      streamRef.current = stream;

      const { cameraOn, microphoneOn } = useDevicesStore.getState();
      stream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
      stream.getAudioTracks().forEach((t) => (t.enabled = microphoneOn));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error("Failed to start media test:", err);
    }
  }, [stopTest]);

  const stopTestSound = useCallback(() => {
    if (testSoundCtxRef.current) {
      testSoundCtxRef.current.close().catch(() => {});
      testSoundCtxRef.current = null;
    }
    setIsPlayingTestSound(false);
  }, []);

  const playTestSound = useCallback(async (speakerId: string) => {
    stopTestSound();
    setIsPlayingTestSound(true);
    try {
      const options: AudioContextOptions & { sinkId?: string } = {};
      if (speakerId) options.sinkId = speakerId;
      const ctx = new AudioContext(options);
      testSoundCtxRef.current = ctx;

      const duration = 1.5;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.4);
        osc.stop(ctx.currentTime + i * 0.4 + 0.4);
      });

      setTimeout(() => {
        stopTestSound();
      }, duration * 1000);
    } catch (err) {
      console.error("Failed to play test sound:", err);
      setIsPlayingTestSound(false);
    }
  }, [stopTestSound]);

  useEffect(() => {
    return () => {
      stopTest();
      stopTestSound();
    };
  }, [stopTest, stopTestSound]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }, []);

  useEffect(() => {
      setVideoEnabled(cameraOn);
  }, [cameraOn, setVideoEnabled]);

  useEffect(() => {
      setAudioEnabled(microphoneOn);
  }, [microphoneOn, setAudioEnabled]);

  return { videoRef, micLevel, startTest, stopTest, playTestSound, isPlayingTestSound, setVideoEnabled, setAudioEnabled };
}
