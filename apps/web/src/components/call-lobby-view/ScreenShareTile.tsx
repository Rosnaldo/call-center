import { useEffect, useRef } from "react";
import type { DailyTrackState } from "@daily-co/daily-js";

interface ScreenShareTileProps {
  screenVideo: DailyTrackState;
}

export function ScreenShareTile({ screenVideo }: ScreenShareTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const track = screenVideo?.persistentTrack ?? screenVideo?.track;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;

    const stream = (el.srcObject as MediaStream) ?? new MediaStream();

    const existing = stream.getVideoTracks()[0];
    if (existing === track) return;

    stream.getVideoTracks().forEach(t => stream.removeTrack(t));
    stream.addTrack(track);

    el.srcObject = stream;
  }, [track]);

  if (!track) return null;

  return (
    <div className="screen-share-tile w-full h-full flex items-center justify-center bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
    </div>
  );
}
