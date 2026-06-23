import { useVideoTrack, useAudioTrack } from "@daily-co/daily-react";
import { useEffect, useRef } from "react";

interface VideoTileProps {
  sessionId: string;
  isLocal?: boolean;
}

export function VideoTile({ sessionId, isLocal }: VideoTileProps) {
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack?.persistentTrack) return;

    const track = videoTrack.persistentTrack;

    const stream = (el.srcObject as MediaStream) ?? new MediaStream();

    const existing = stream.getVideoTracks()[0];
    if (existing === track) return;

    stream.getVideoTracks().forEach(t => stream.removeTrack(t));
    stream.addTrack(track);

    el.srcObject = stream;
  }, [videoTrack?.persistentTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || isLocal || !audioTrack?.persistentTrack) return;

    let stream = el.srcObject as MediaStream | null;

    if (!stream) {
      stream = new MediaStream();
      el.srcObject = stream;
    }

    const currentTrack = stream.getAudioTracks()[0];

    if (currentTrack === audioTrack.persistentTrack) return;

    stream.getAudioTracks().forEach(t => stream.removeTrack(t));
    stream.addTrack(audioTrack.persistentTrack);
  }, [audioTrack?.persistentTrack]);

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
