import React, { useState } from "react";
import type { CallMediaSettings, SfuCallState } from "roomkit-sdk/browser/types";
import { mediaWithVoicePreferences, type VoicePreferences } from "../localVoicePreferences";
import type { MediaRoom, ScreenShare } from "../types";
import { Avatar } from "./Avatar";
import { GearIcon, HeadphonesIcon, HeadphonesOffIcon, MicIcon, MicOffIcon, PhoneIcon, ScreenIcon, SpeakerIcon, StatusIcon, VideoIcon, VideoOffIcon } from "./Icons";
import { VoiceSettingsDialog } from "./VoiceSettingsDialog";

type Props = {
  actorName: string;
  actorAvatar?: string;
  actorRole: string;
  rooms: MediaRoom[];
  selectedRoomId?: string;
  joinedRoomId?: string;
  localMedia?: CallMediaSettings;
  sfu: SfuCallState;
  error?: string;
  voicePreferences: VoicePreferences;
  reconnectRoom?: MediaRoom;
  screenShares: ScreenShare[];
  onUpdateMedia: (room: MediaRoom, media: CallMediaSettings) => void;
  onLeave: (roomId: string) => void;
  onReconnect: (room: MediaRoom) => void;
  onDismissReconnect: () => void;
  onStopShare: (shareId: string) => void;
  onUpdateVoicePreferences: (preferences: VoicePreferences) => void;
  onVoiceSettingsOpenChange?: (open: boolean) => void;
  onUpdateStatus: (status: string, activity: string) => void;
};

function activeScreenShare(screenShares: ScreenShare[], roomId?: string) {
  if (!roomId) return undefined;
  return screenShares.find((share) => !share.stoppedAt && (share.roomId === roomId || share.scopeId === roomId));
}

function roomForControls(rooms: MediaRoom[], selectedRoomId: string | undefined, joinedRoomId: string | undefined, activeRoomId: string | undefined) {
  const available = rooms.filter((room) => !room.archivedAt);
  return available.find((room) => room.id === activeRoomId)
    || available.find((room) => room.id === joinedRoomId)
    || available.find((room) => room.id === selectedRoomId)
    || available[0];
}

export function UserControls({
  actorName,
  actorAvatar,
  actorRole,
  rooms,
  selectedRoomId,
  joinedRoomId,
  localMedia,
  sfu,
  error,
  voicePreferences,
  reconnectRoom,
  screenShares,
  onUpdateMedia,
  onLeave,
  onReconnect,
  onDismissReconnect,
  onStopShare,
  onUpdateVoicePreferences,
  onVoiceSettingsOpenChange,
  onUpdateStatus
}: Props) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceTestActive, setVoiceTestActive] = useState(false);
  const latestVoicePreferences = React.useRef(voicePreferences);
  const room = roomForControls(rooms, selectedRoomId, joinedRoomId, sfu.mediaRoomId);
  const sfuActive = Boolean(room && sfu.mediaRoomId === room.id && (sfu.status === "connected" || sfu.status === "connecting"));
  const joined = Boolean(room && joinedRoomId === room.id);
  const activeMedia = sfuActive ? sfu.media : localMedia;
  const audioOn = !voiceTestActive && !voicePreferences.muted && !voicePreferences.deafened;
  const videoOn = Boolean(activeMedia?.video);
  const screenOn = Boolean(activeMedia?.screen);
  const currentShare = joined ? activeScreenShare(screenShares, room?.id) : undefined;
  const shareActive = screenOn || Boolean(currentShare);
  const canUseVideo = joined && room?.allowsVideo !== false;
  const voiceTitle = sfuActive && sfu.status === "connecting" ? "Voice connecting" : sfuActive ? "Voice connected" : "Voice joined";

  function updateRoomMedia(media: CallMediaSettings) {
    if (room && joined) onUpdateMedia(room, media);
  }

  const mediaBeforeSettings = React.useRef<CallMediaSettings | undefined>();

  React.useEffect(() => {
    latestVoicePreferences.current = voicePreferences;
  }, [voicePreferences]);

  React.useEffect(() => {
    onVoiceSettingsOpenChange?.(settingsOpen);
    return () => onVoiceSettingsOpenChange?.(false);
  }, [onVoiceSettingsOpenChange, settingsOpen]);

  function audioSuspendedVoiceSettingsMedia(preferences: VoicePreferences): CallMediaSettings {
    const restore = mediaBeforeSettings.current || activeMedia;
    return mediaWithVoicePreferences({
      audio: false,
      video: restore ? Boolean(restore.video) : videoOn,
      screen: restore ? Boolean(restore.screen) : screenOn
    }, preferences);
  }

  function mediaForVoicePreferences(preferences: VoicePreferences, suspended = voiceTestActive || settingsOpen): CallMediaSettings {
    if (suspended) return audioSuspendedVoiceSettingsMedia(preferences);
    const restore = mediaBeforeSettings.current;
    return mediaWithVoicePreferences({
      audio: (restore ? restore.audio !== false : true) && !preferences.muted && !preferences.deafened,
      video: restore ? Boolean(restore.video) : videoOn,
      screen: restore ? Boolean(restore.screen) : screenOn
    }, preferences);
  }

  function updateVoicePreferences(preferences: VoicePreferences) {
    latestVoicePreferences.current = preferences;
    onUpdateVoicePreferences(preferences);
    updateRoomMedia(mediaForVoicePreferences(preferences));
  }

  function suspendVoiceSettingsMedia(preferences: VoicePreferences) {
    setVoiceTestActive(true);
    updateRoomMedia(audioSuspendedVoiceSettingsMedia(preferences));
  }

  function restoreVoiceSettingsMedia(preferences: VoicePreferences) {
    setVoiceTestActive(false);
    updateRoomMedia(mediaForVoicePreferences(preferences, false));
    mediaBeforeSettings.current = undefined;
  }

  function openVoiceSettings() {
    if (!settingsOpen) {
      const preferences = latestVoicePreferences.current;
      mediaBeforeSettings.current = activeMedia ? { ...activeMedia } : mediaForVoicePreferences(preferences, false);
      suspendVoiceSettingsMedia(preferences);
    }
    setSettingsOpen(true);
  }

  function closeVoiceSettings() {
    setSettingsOpen(false);
    restoreVoiceSettingsMedia(latestVoicePreferences.current);
  }

  function toggleMute() {
    const preferences = latestVoicePreferences.current;
    updateVoicePreferences({ ...preferences, muted: !preferences.muted });
  }

  function toggleDeafen() {
    const preferences = latestVoicePreferences.current;
    updateVoicePreferences({ ...preferences, deafened: !preferences.deafened });
  }

  function setStatus(status: string, activity: string) {
    setStatusMenuOpen(false);
    onUpdateStatus(status, activity);
  }

  function toggleScreenShare() {
    if (!room || !joined) return;
    if (!screenOn && currentShare) {
      onStopShare(currentShare.id);
      return;
    }
    updateRoomMedia({ audio: audioOn, video: videoOn, screen: !screenOn });
  }

  return (
    <footer className="self-panel" aria-label="User controls">
      {statusMenuOpen ? (
        <div className="status-menu" role="menu" aria-label="Set status">
          <button type="button" role="menuitem" aria-label="Set online" onClick={() => setStatus("online", "available")}>
            <StatusIcon status="online" />
            <span>
              <strong>Online</strong>
              <small>Available to chat</small>
            </span>
          </button>
          <button type="button" role="menuitem" aria-label="Set busy" onClick={() => setStatus("busy", "in a room")}>
            <StatusIcon status="busy" />
            <span>
              <strong>Busy</strong>
              <small>Limit notifications</small>
            </span>
          </button>
          <button type="button" role="menuitem" aria-label="Set away" onClick={() => setStatus("away", "away")}>
            <StatusIcon status="away" />
            <span>
              <strong>Away</strong>
              <small>Back later</small>
            </span>
          </button>
        </div>
      ) : null}

      {joined && room ? (
        <section className={`voice-panel${sfuActive ? " connected" : " joined"}`} aria-label="Voice controls">
          <div className="voice-panel-header">
            <SpeakerIcon className="ui-icon voice-status-icon" />
            <span>
              <strong>{voiceTitle}</strong>
              <small>{room.name}</small>
            </span>
            <button className="voice-leave-button" type="button" aria-label="Leave voice room" onClick={() => onLeave(room.id)}>
              <PhoneIcon />
            </button>
          </div>

          <div className="voice-control-row">
            <button
              className={`voice-control-button${videoOn ? " active" : ""}`}
              type="button"
              aria-label={videoOn ? "Turn camera off" : "Turn camera on"}
              disabled={!canUseVideo}
              onClick={() => updateRoomMedia({ audio: audioOn, video: !videoOn, screen: screenOn })}
            >
              {videoOn ? <VideoIcon /> : <VideoOffIcon />}
              <span>{videoOn ? "Video on" : "Video off"}</span>
            </button>
            <button
              className={`voice-control-button${shareActive ? " active" : ""}`}
              type="button"
              aria-label={shareActive ? "Stop screen share" : "Share screen"}
              onClick={toggleScreenShare}
            >
              <ScreenIcon />
              <span>{shareActive ? "Stop share" : "Share"}</span>
            </button>
          </div>

          {error ? <p className="call-error">{error}</p> : null}
        </section>
      ) : null}

      {!joined && reconnectRoom ? (
        <section className="voice-reconnect-panel" aria-label="Voice reconnect prompt">
          <span>
            <strong>Reconnect to {reconnectRoom.name}?</strong>
            <small>Recent voice session</small>
          </span>
          <span className="voice-reconnect-actions">
            <button type="button" className="secondary-action" onClick={() => onReconnect(reconnectRoom)}>
              Reconnect
            </button>
            <button type="button" className="ghost-action" onClick={onDismissReconnect}>
              Dismiss
            </button>
          </span>
        </section>
      ) : null}

      <div className="self-account-row">
        <button
          className="self-identity"
          type="button"
          aria-haspopup="menu"
          aria-expanded={statusMenuOpen}
          aria-label="Open status menu"
          onClick={() => setStatusMenuOpen((open) => !open)}
        >
          <Avatar name={actorName} avatar={actorAvatar} />
          <span>
            <strong>{actorName}</strong>
            <small>{actorRole}</small>
          </span>
        </button>
        <div className="self-audio-controls" aria-label="Local voice preferences">
          <button
            className={`self-icon-button${voicePreferences.muted ? " active" : ""}`}
            type="button"
            aria-label={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
            title={voicePreferences.muted ? "Unmute mic" : "Mute mic"}
            onClick={toggleMute}
          >
            {voicePreferences.muted || voicePreferences.deafened ? <MicOffIcon /> : <MicIcon />}
          </button>
          <button
            className={`self-icon-button${voicePreferences.deafened ? " active" : ""}`}
            type="button"
            aria-label={voicePreferences.deafened ? "Undeafen" : "Deafen"}
            title={voicePreferences.deafened ? "Undeafen" : "Deafen"}
            onClick={toggleDeafen}
          >
            {voicePreferences.deafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
          </button>
          <button
            className="self-icon-button"
            type="button"
            aria-label="Open voice settings"
            title="Voice settings"
            onClick={openVoiceSettings}
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <VoiceSettingsDialog
          preferences={voicePreferences}
          onChange={updateVoicePreferences}
          onClose={closeVoiceSettings}
        />
      ) : null}
    </footer>
  );
}
