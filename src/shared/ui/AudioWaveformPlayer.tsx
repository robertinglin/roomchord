import React, { useEffect, useRef, useState } from "react";

const DEFAULT_WAVEFORM = [0.18, 0.24, 0.2, 0.32, 0.46, 0.28, 0.22, 0.38, 0.56, 0.34, 0.25, 0.3, 0.42, 0.27, 0.2, 0.35, 0.48, 0.29, 0.24, 0.4, 0.62, 0.44, 0.3, 0.22, 0.26, 0.36, 0.52, 0.33, 0.23, 0.31, 0.45, 0.28, 0.19, 0.34, 0.5, 0.3, 0.22, 0.39, 0.58, 0.37, 0.25, 0.29, 0.43, 0.27, 0.2, 0.32, 0.47, 0.26];

function PlaybackGlyph({ playing }: { playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" viewBox="0 0 16 16"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" /></svg>
  );
}

export function formatAudioDuration(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function seekTo(audio: HTMLAudioElement, seconds: number, duration: number, setCurrentTime: (value: number) => void) {
  const next = Math.max(0, Math.min(seconds, duration || seconds));
  audio.currentTime = next;
  setCurrentTime(next);
}

function playbackType(source: Blob | undefined): string | undefined {
  const type = source?.type.trim();
  if (!type) return undefined;
  // Chromium can reject an audio-only WebM blob when the element has to infer
  // the codec from a blob URL. Voice recordings in Mosh are Opus in WebM.
  if (type.toLowerCase() === "audio/webm") return "audio/webm; codecs=opus";
  return type;
}

function isNonSeekableWebm(audio: HTMLAudioElement): boolean {
  return audio.querySelector("source")?.type.toLowerCase().startsWith("audio/webm") === true;
}

export function AudioWaveformPlayer({
  src,
  label,
  waveform = DEFAULT_WAVEFORM,
  waveformSource,
  initialDurationSeconds = 0,
  onDurationChange,
  onError
}: {
  src: string;
  label: string;
  waveform?: number[];
  waveformSource?: Blob;
  initialDurationSeconds?: number;
  onDurationChange?: (seconds: number) => void;
  onError?: () => void;
}) {
  const sourceType = playbackType(waveformSource);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef(false);
  const recoverPlaybackRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Math.max(0, initialDurationSeconds));
  const [decodedWaveform, setDecodedWaveform] = useState<number[]>();
  const [seekUnsupported, setSeekUnsupported] = useState(false);
  const [audioGeneration, setAudioGeneration] = useState(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(Math.max(0, initialDurationSeconds));
    setSeekUnsupported(false);
    pendingSeekRef.current = false;
  }, [src, initialDurationSeconds]);

  useEffect(() => {
    if (!recoverPlaybackRef.current) return;
    recoverPlaybackRef.current = false;
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().then(() => setPlaying(true)).catch((error: unknown) => {
      setPlaying(false);
      console.warn("[mosh audio] playback recovery rejected", { error });
    });
  }, [audioGeneration]);

  useEffect(() => {
    let active = true;
    setDecodedWaveform(undefined);
    if (!waveformSource) return () => { active = false; };
    const AudioContextConstructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return () => { active = false; };
    let context: AudioContext | undefined;
    void waveformSource.arrayBuffer().then((data) => {
      if (!active) return undefined;
      context = new AudioContextConstructor();
      return context.decodeAudioData(data);
    }).then((decoded) => {
      if (!active || !decoded) return;
      updateDuration(decoded.duration);
      const channel = decoded.getChannelData(0);
      const bucketCount = 48;
      const peaks = Array.from({ length: bucketCount }, (_, bucket) => {
        const start = Math.floor(bucket * channel.length / bucketCount);
        const end = Math.max(start + 1, Math.floor((bucket + 1) * channel.length / bucketCount));
        let peak = 0;
        for (let index = start; index < end && index < channel.length; index += 1) peak = Math.max(peak, Math.abs(channel[index] ?? 0));
        return peak;
      });
      const maximum = Math.max(...peaks, 0.01);
      if (active) setDecodedWaveform(peaks.map((peak) => Math.max(0.12, peak / maximum)));
    }).catch(() => undefined).finally(() => {
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
    });
    return () => {
      active = false;
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
    };
  }, [src, waveformSource]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const updatePlaybackPosition = () => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      updateDuration(audio.duration);
      frame = requestAnimationFrame(updatePlaybackPosition);
    };
    frame = requestAnimationFrame(updatePlaybackPosition);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function updateDuration(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    durationRef.current = value;
    setDuration(value);
    onDurationChange?.(value);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const replaying = audio.ended || (durationRef.current > 0 && audio.currentTime >= durationRef.current);
      if (replaying && isNonSeekableWebm(audio)) audio.load();
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === "function") {
        void playResult.catch((error: unknown) => {
          setPlaying(false);
          console.warn("[mosh audio] playback rejected", {
            error,
            code: audio.error?.code ?? null,
            message: audio.error?.message ?? null,
            networkState: audio.networkState,
            readyState: audio.readyState,
            sourceType: audio.querySelector("source")?.type || null
          });
        });
      }
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seekFromPointer(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || seekUnsupported) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pendingSeekRef.current = true;
    seekTo(audio, ratio * durationRef.current, durationRef.current, setCurrentTime);
  }

  function seekFromKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || seekUnsupported) return;
    const step = event.shiftKey ? 10 : 5;
    let next: number | undefined;
    if (event.key === "ArrowLeft") next = currentTime - step;
    if (event.key === "ArrowRight") next = currentTime + step;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = durationRef.current;
    if (next === undefined) return;
    event.preventDefault();
    pendingSeekRef.current = true;
    seekTo(audio, next, durationRef.current, setCurrentTime);
  }

  const elapsed = formatAudioDuration(currentTime);
  const total = formatAudioDuration(duration);
  const levels = decodedWaveform ?? (waveform.length > 0 ? waveform : DEFAULT_WAVEFORM);
  const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const preload = sourceType?.toLowerCase().startsWith("audio/webm") ? "none" : "metadata";

  return (
    <div className="audio-waveform-player" aria-label={label}>
      <audio
        key={audioGeneration}
        className="audio-waveform-media"
        ref={audioRef}
        preload={preload}
        aria-hidden="true"
        onLoadedMetadata={(event) => updateDuration(event.currentTarget.duration)}
        onDurationChange={(event) => updateDuration(event.currentTarget.duration)}
        onSeeked={() => { pendingSeekRef.current = false; }}
        onTimeUpdate={(event) => { setCurrentTime(event.currentTarget.currentTime); updateDuration(event.currentTarget.duration); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(durationRef.current); }}
        onError={(event) => {
          const audio = event.currentTarget;
          if (pendingSeekRef.current) {
            pendingSeekRef.current = false;
            recoverPlaybackRef.current = true;
            setSeekUnsupported(true);
            setCurrentTime(0);
            setAudioGeneration((generation) => generation + 1);
            return;
          }
          console.warn("[mosh audio] media error", {
            code: audio.error?.code ?? null,
            message: audio.error?.message ?? null,
            networkState: audio.networkState,
            readyState: audio.readyState,
            sourceType: audio.querySelector("source")?.type || null
          });
          onError?.();
        }}
      >
        <source src={src} type={sourceType} />
      </audio>
      <button className="audio-waveform-toggle" type="button" onClick={togglePlayback} aria-label={`${playing ? "Pause" : "Play"} ${label}`} aria-pressed={playing}>
        <PlaybackGlyph playing={playing} />
      </button>
      <div
        className={`voice-waveform${seekUnsupported ? " is-seek-disabled" : ""}`}
        {...(seekUnsupported ? { "aria-disabled": true } : {
          role: "slider",
          tabIndex: 0,
          "aria-label": `Seek ${label}`,
          "aria-valuemin": 0,
          "aria-valuemax": duration,
          "aria-valuenow": Math.min(currentTime, duration || currentTime),
          "aria-valuetext": `${elapsed} of ${total}`
        })}
        onClick={seekFromPointer}
        onKeyDown={seekFromKeyboard}
      >
        {levels.map((level, index) => <span className={index / levels.length < playedRatio ? "is-played" : undefined} key={index} style={{ height: `${Math.round(Math.max(0.12, Math.min(1, level)) * 100)}%` }} />)}
      </div>
      <span className="audio-waveform-time" role="timer" aria-label={`${label} playback time`}>{elapsed} / {total}</span>
    </div>
  );
}
