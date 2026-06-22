import React, { useEffect, useRef } from "react";

type Props = {
  className?: string;
  label: string;
  muted?: boolean;
  stream?: MediaStream;
};

function attachStream(element: HTMLMediaElement | null, stream: MediaStream | undefined) {
  if (!element || element.srcObject === stream) return;
  element.srcObject = stream || null;
  const playResult = stream ? element.play?.() : undefined;
  if (playResult && typeof playResult.catch === "function") void playResult.catch(() => undefined);
}

export function VideoStream({ className, label, muted, stream }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    attachStream(ref.current, stream);
  }, [stream]);
  if (!stream) return null;
  return <video aria-label={label} autoPlay className={className} muted={muted} playsInline ref={ref} />;
}

export function AudioStream({ label, muted, stream }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    attachStream(ref.current, stream);
  }, [stream]);
  if (!stream) return null;
  return <audio aria-label={label} autoPlay muted={muted} ref={ref} />;
}
