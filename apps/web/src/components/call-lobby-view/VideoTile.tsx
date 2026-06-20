import { useVideoTrack, useAudioTrack } from "@daily-co/daily-react";
import { useEffect, useRef } from "react";

interface VideoTileProps {
  sessionId: string;
  isLocal?: boolean;
  onCameraChange?: (cameraOn: boolean) => void;
}

export function VideoTile({ sessionId, isLocal, onCameraChange }: VideoTileProps) {
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!videoTrack?.persistentTrack || !videoRef.current) return;
    videoRef.current.srcObject = new MediaStream([videoTrack.persistentTrack]);
  }, [videoTrack?.persistentTrack]);

  useEffect(() => {
    if (!audioTrack?.persistentTrack || !audioRef.current || isLocal) return;
    audioRef.current.srcObject = new MediaStream([audioTrack.persistentTrack]);
  }, [audioTrack?.persistentTrack, isLocal]);

  useEffect(() => {
    onCameraChange?.(!videoTrack?.isOff);
  }, [videoTrack?.isOff, onCameraChange]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
      />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
}
