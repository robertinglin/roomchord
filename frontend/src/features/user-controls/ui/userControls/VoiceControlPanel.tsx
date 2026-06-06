import React from "react";
import { PhoneIcon, ScreenIcon, SpeakerIcon, VideoIcon, VideoOffIcon } from "@shared/ui/Icons";

export function VoiceControlPanel({
  canUseVideo,
  error,
  onLeave,
  onToggleScreenShare,
  onToggleVideo,
  roomName,
  sfuActive,
  sfuStatus,
  shareActive,
  videoOn
}: {
  canUseVideo: boolean;
  error?: string;
  onLeave: () => void;
  onToggleScreenShare: () => void;
  onToggleVideo: () => void;
  roomName: string;
  sfuActive: boolean;
  sfuStatus: string;
  shareActive: boolean;
  videoOn: boolean;
}) {
  const voiceTitle = sfuActive && sfuStatus === "connecting" ? "Voice connecting" : sfuActive ? "Voice connected" : "Voice joined";
  return (
    <section className={`voice-panel${sfuActive ? " connected" : " joined"}`} aria-label="Voice controls">
      <div className="voice-panel-header">
        <SpeakerIcon className="ui-icon voice-status-icon" />
        <span>
          <strong>{voiceTitle}</strong>
          <small>{roomName}</small>
        </span>
        <button className="voice-leave-button" type="button" aria-label="Leave voice room" onClick={onLeave}>
          <PhoneIcon />
        </button>
      </div>

      <div className="voice-control-row">
        <button
          className={`voice-control-button${videoOn ? " active" : ""}`}
          type="button"
          aria-label={videoOn ? "Turn camera off" : "Turn camera on"}
          disabled={!canUseVideo}
          onClick={onToggleVideo}
        >
          {videoOn ? <VideoIcon /> : <VideoOffIcon />}
          <span>{videoOn ? "Video on" : "Video off"}</span>
        </button>
        <button
          className={`voice-control-button${shareActive ? " active" : ""}`}
          type="button"
          aria-label={shareActive ? "Stop screen share" : "Share screen"}
          onClick={onToggleScreenShare}
        >
          <ScreenIcon />
          <span>{shareActive ? "Stop share" : "Share"}</span>
        </button>
      </div>

      {error ? <p className="call-error">{error}</p> : null}
    </section>
  );
}
