import React, { useEffect, useRef, useState } from "react";
import { Button, CloseGlyph, MicGlyph, PlusGlyph } from "@shared/ui/design";
import type { AttachmentTransferState } from "@shared/model/attachments";
import type { AttachmentPickerConfig } from "@shared/model/attachmentPicker";
import { AttachmentPickerAdvanced } from "@shared/ui/AttachmentPickerAdvanced";
import { AudioWaveformPlayer } from "@shared/ui/AudioWaveformPlayer";

export function createVoiceRecordingFileName(date = new Date(), extension = "webm") {
  const pad = (value: number) => String(value).padStart(2, "0");
  const localDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const localTime = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "") || "webm";
  return `Voice message ${localDate} at ${localTime}.${safeExtension}`;
}

function recordingExtension(mimeType: string) {
  const subtype = mimeType.split("/", 2)[1]?.split(";", 1)[0]?.toLowerCase();
  if (subtype === "ogg" || subtype === "oga") return "ogg";
  if (subtype === "mp4" || subtype === "mpeg" || subtype === "wav" || subtype === "x-wav") return subtype === "x-wav" ? "wav" : subtype;
  return "webm";
}

function GoogleDriveGlyph() {
  return (
    <svg className="voice-drive-glyph" aria-hidden="true" viewBox="0 0 18 18">
      <path fill="#34a853" d="M6.1 1.5h4.4l5.9 10.2h-4.5z" />
      <path fill="#fbbc04" d="M6.1 1.5 1.5 9.6l2.2 3.8 4.6-8z" />
      <path fill="#4285f4" d="M3.7 13.4 6 17.2h8.9l2.2-3.8z" />
    </svg>
  );
}

function TransferStatus({ transfer }: { transfer: AttachmentTransferState }) {
  if (transfer.error) return <><small role="alert">{transfer.error}</small>{transfer.recovery ? <small role="status">{transfer.recovery.cleanupFailed ? `Drive file ${transfer.recovery.fileId} must be removed manually.` : "The uploaded Drive file was removed."}</small> : null}</>;
  if (transfer.phase === "idle") return null;
  const label = transfer.phase === "sharing" ? "Sharing to Google Drive" : transfer.phase === "downloading" ? "Downloading" : "Uploading";
  return <small aria-live="polite">{label}{transfer.name ? ` ${transfer.name}` : ""}{transfer.progress === undefined ? "…" : ` ${Math.round(transfer.progress * 100)}%`}</small>;
}

export function AttachmentPicker({
  advancedPicker,
  disabled,
  onUpload,
  onShareDrive,
  transfer,
  unavailableReason
}: {
  advancedPicker?: AttachmentPickerConfig;
  disabled?: boolean;
  onUpload?: (file: File) => void;
  onShareDrive?: (file: File) => void;
  transfer: AttachmentTransferState;
  unavailableReason?: string;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const driveInput = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recordingStatus, setRecordingStatusState] = useState<"idle" | "requesting" | "recording" | "stopping" | "preview">("idle");
  const [recordedVoice, setRecordedVoice] = useState<File>();
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>();
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() => Array.from({ length: 24 }, () => 0.25));
  const [recordingError, setRecordingError] = useState<string>();
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStatusRef = useRef<"idle" | "requesting" | "recording" | "stopping" | "preview">("idle");
  const mountedRef = useRef(true);
  const sessionRef = useRef(0);
  const recordingStartedAtRef = useRef<number | undefined>(undefined);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const waveformTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | undefined>(undefined);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const driveBrowserEnabled = !disabled && Boolean(advancedPicker?.adapter);
  const recording = recordingStatus === "recording" || recordingStatus === "stopping";

  function setRecordingStatus(status: typeof recordingStatus) {
    recordingStatusRef.current = status;
    if (mountedRef.current) setRecordingStatusState(status);
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }

  function stopWaveform() {
    if (waveformTimerRef.current) clearInterval(waveformTimerRef.current);
    waveformTimerRef.current = undefined;
    analyserRef.current = undefined;
    const context = audioContextRef.current;
    audioContextRef.current = undefined;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }

  function revokeVoiceUrl() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = undefined;
    if (mountedRef.current) setRecordedVoiceUrl(undefined);
  }

  function clearRecordedVoice() {
    revokeVoiceUrl();
    setRecordedVoice(undefined);
    setRecordingDuration(0);
    setWaveformLevels(Array.from({ length: 24 }, () => 0.25));
  }

  useEffect(() => () => {
    mountedRef.current = false;
    sessionRef.current += 1;
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    stopWaveform();
    stopStream();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = undefined;
    revokeVoiceUrl();
  }, []);

  function formatDuration(milliseconds: number) {
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function startWaveform(stream: MediaStream, session: number) {
    const AudioContextConstructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextConstructor) {
      try {
        const context = new AudioContextConstructor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 64;
        context.createMediaStreamSource(stream).connect(analyser);
        if (context.state === "suspended") void context.resume().catch(() => undefined);
        audioContextRef.current = context;
        analyserRef.current = analyser;
      } catch {
        // Some browsers expose AudioContext but disallow microphone sources.
        stopWaveform();
      }
    }
    const data = analyserRef.current ? new Uint8Array(analyserRef.current.fftSize) : undefined;
    const update = () => {
      if (!mountedRef.current || sessionRef.current !== session || recordingStatusRef.current !== "recording") return;
      if (analyserRef.current && data) {
        analyserRef.current.getByteTimeDomainData(data);
        const next = Array.from({ length: 24 }, (_, index) => {
          const sample = data[Math.floor(index * data.length / 24)] ?? 128;
          return Math.max(0.12, Math.abs(sample - 128) / 96);
        });
        setWaveformLevels(next);
      } else {
        const time = Date.now() / 180;
        setWaveformLevels(Array.from({ length: 24 }, (_, index) => 0.2 + Math.abs(Math.sin(time + index * 0.65)) * 0.65));
      }
    };
    update();
    waveformTimerRef.current = setInterval(update, 100);
  }

  function beginRecording(stream: MediaStream, recorder: MediaRecorder, session: number) {
    if (!mountedRef.current || sessionRef.current !== session || recorderRef.current !== recorder) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    setRecordingStatus("recording");
    recordingStartedAtRef.current = performance.now();
    setRecordingDuration(0);
    durationTimerRef.current = setInterval(() => {
      if (recordingStartedAtRef.current !== undefined) setRecordingDuration(performance.now() - recordingStartedAtRef.current);
    }, 250);
    startWaveform(stream, session);
  }

  async function startVoiceRecording() {
    if (recordingStatusRef.current === "requesting" || recordingStatusRef.current === "recording" || recordingStatusRef.current === "stopping") return;
    clearRecordedVoice();
    setMenuOpen(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingStatus("idle");
      setRecordingError("Voice recording is unavailable in this browser.");
      return;
    }
    setRecordingError(undefined);
    setRecordingStatus("requesting");
    const session = ++sessionRef.current;
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || sessionRef.current !== session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("error", () => {
        if (!mountedRef.current || sessionRef.current !== session) return;
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        durationTimerRef.current = undefined;
        stopWaveform();
        stopStream();
        recorderRef.current = undefined;
        setRecordingStatus("idle");
        setRecordingError("The microphone stopped unexpectedly. Please try recording again.");
      }, { once: true });
      recorder.addEventListener("stop", () => {
        if (!mountedRef.current || sessionRef.current !== session) return;
        const duration = recordingStartedAtRef.current === undefined ? 0 : performance.now() - recordingStartedAtRef.current;
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        durationTimerRef.current = undefined;
        stopWaveform();
        stopStream();
        recorderRef.current = undefined;
        const outputMimeType = recorder.mimeType || mimeType;
        const file = new File(chunksRef.current, createVoiceRecordingFileName(new Date(), recordingExtension(outputMimeType)), { type: outputMimeType });
        chunksRef.current = [];
        setRecordedVoice(file);
        setRecordingDuration(duration);
        const createObjectUrl = typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : undefined;
        objectUrlRef.current = createObjectUrl;
        setRecordedVoiceUrl(createObjectUrl);
        setRecordingStatus("preview");
      }, { once: true });
      recorder.start();
      // MediaRecorder changes state synchronously in compliant browsers. The
      // start event is also handled for implementations that do not.
      if (recorder.state === "recording") beginRecording(stream, recorder, session);
      else recorder.addEventListener("start", () => beginRecording(stream!, recorder, session), { once: true });
    } catch (error) {
      stopStream();
      stream?.getTracks().forEach((track) => track.stop());
      recorderRef.current = undefined;
      setRecordingStatus("idle");
      const errorName = error && typeof error === "object" && "name" in error ? String(error.name) : "";
      setRecordingError(errorName === "NotAllowedError" || errorName === "PermissionDeniedError" ? "Microphone permission was denied. Allow microphone access to record a voice message." : error instanceof Error ? error.message : "Could not access the microphone.");
    }
  }

  function stopVoiceRecording() {
    const recorder = recorderRef.current;
    if (recordingStatusRef.current !== "recording" || recorder?.state !== "recording") return;
    setRecordingStatus("stopping");
    try {
      recorder.stop();
    } catch {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = undefined;
      stopWaveform();
      stopStream();
      recorderRef.current = undefined;
      setRecordingStatus("idle");
      setRecordingError("Could not finish the voice recording. Please try again.");
    }
  }

  function useRecordedVoice(destination: "relay" | "google-drive") {
    if (!recordedVoice) return;
    if (destination === "relay") onUpload?.(recordedVoice);
    else onShareDrive?.(recordedVoice);
    clearRecordedVoice();
    setRecordingStatus("idle");
    setMenuOpen(false);
  }

  return (
    <span className="attachment-picker">
      <input ref={uploadInput} type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload?.(file); event.target.value = ""; }} />
      <input ref={driveInput} type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onShareDrive?.(file); event.target.value = ""; }} />
      <Button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Add file"
        title="Add a file"
        disabled={disabled || recordingStatus !== "idle"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        + File
      </Button>
      <Button
        aria-label={recordingStatus === "requesting" ? "Requesting microphone permission" : recordingStatus === "stopping" ? "Finishing voice recording" : recording ? "Stop voice recording" : "Record voice message"}
        title={recordingStatus === "requesting" ? "Waiting for microphone permission" : recording ? "Stop voice recording" : "Record voice message"}
        disabled={disabled || Boolean(unavailableReason) || recordingStatus === "requesting" || recordingStatus === "stopping"}
        onClick={recording ? stopVoiceRecording : () => void startVoiceRecording()}
      >
        <MicGlyph size={16} />
      </Button>
      {menuOpen ? (
        <div className="attachment-picker-menu" role="menu" aria-label="File options">
          <button role="menuitem" type="button" disabled={Boolean(unavailableReason) || !onUpload} onClick={() => { setMenuOpen(false); uploadInput.current?.click(); }}>
            <strong>Upload file</strong>
            <span>Send a local file through the relay</span>
          </button>
          <button role="menuitem" type="button" disabled={!onShareDrive} onClick={() => { setMenuOpen(false); driveInput.current?.click(); }}>
            <strong>Upload through Google Drive</strong>
            <span>Upload a local file to Drive, then share it</span>
          </button>
          <button role="menuitem" type="button" disabled={!driveBrowserEnabled} onClick={() => { setMenuOpen(false); setAdvancedOpen(true); }}>
            <strong>Share from Google Drive</strong>
            <span>Choose a file already in Drive</span>
          </button>
        </div>
      ) : null}
      {recordingStatus === "requesting" ? <small role="status" aria-live="polite">Waiting for microphone permission…</small> : null}
      {recordingStatus === "recording" || recordingStatus === "stopping" ? (
        <div className="voice-recording" aria-label="Voice recording in progress">
          <strong>{recordingStatus === "stopping" ? "Finishing recording" : "Recording voice message"}</strong>
          <span role="timer" aria-label={`Recording duration ${formatDuration(recordingDuration)}`}>{formatDuration(recordingDuration)}</span>
          <div className="voice-waveform" role="img" aria-label="Live voice waveform">
            {waveformLevels.map((level, index) => <span key={index} style={{ height: `${Math.round(level * 100)}%` }} />)}
          </div>
          <button className="voice-recording-stop" type="button" disabled={recordingStatus === "stopping"} onClick={stopVoiceRecording}>
            {recordingStatus === "stopping" ? "Finishing…" : "Stop and preview"}
          </button>
        </div>
      ) : null}
      {recordingStatus === "preview" && recordedVoice ? (
        <div className="voice-preview" aria-label="Voice message preview">
          <button className="voice-preview-close" type="button" aria-label="Discard recording" title="Discard recording" onClick={() => { clearRecordedVoice(); setRecordingStatus("idle"); }}><CloseGlyph size={15} /></button>
          <strong>Voice message preview</strong>
          <small>{recordedVoice.name}</small>
          {recordedVoiceUrl ? <AudioWaveformPlayer src={recordedVoiceUrl} label="recorded voice message" waveform={waveformLevels} waveformSource={recordedVoice} initialDurationSeconds={recordingDuration / 1000} onDurationChange={(duration) => setRecordingDuration(duration * 1000)} /> : <small role="status">Audio preview is unavailable in this browser.</small>}
          <div className="voice-preview-actions">
            <button type="button" aria-label="Add recording to message" title="Add recording to message" disabled={Boolean(unavailableReason) || !onUpload} onClick={() => useRecordedVoice("relay")}><PlusGlyph size={18} /></button>
            <button className="voice-preview-drive-action" type="button" aria-label="Add recording through Google Drive" title="Add recording through Google Drive" disabled={!onShareDrive} onClick={() => useRecordedVoice("google-drive")}><PlusGlyph size={18} /><GoogleDriveGlyph /></button>
          </div>
        </div>
      ) : null}
      {unavailableReason ? <small role="status">{unavailableReason}</small> : null}
      {recordingError ? <small role="alert">{recordingError}</small> : null}
      <TransferStatus transfer={transfer} />
      {advancedOpen ? (
        <AttachmentPickerAdvanced
          adapter={advancedPicker?.adapter}
          acceptedMimeTypes={advancedPicker?.acceptedMimeTypes}
          driveOnly
          mode={advancedPicker?.mode}
          roomName={advancedPicker?.roomName}
          scopeId={advancedPicker?.scopeId}
          scopeType={advancedPicker?.scopeType}
          onClose={() => setAdvancedOpen(false)}
          onSelect={(selection) => {
            setAdvancedOpen(false);
            void advancedPicker?.onSelect?.(selection);
          }}
        />
      ) : null}
    </span>
  );
}
