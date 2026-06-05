import React, { useState } from "react";
import type { CallMediaSettings, SfuCallState } from "roomkit-sdk/browser/types";
import { mediaWithVoicePreferences, type VoicePreferences } from "../localVoicePreferences";
import type { MediaRoom, ScreenShare } from "../types";
import { VoiceSettingsDialog } from "./VoiceSettingsDialog";
import { ReconnectPrompt } from "./userControls/ReconnectPrompt";
import { SelfAccountRow } from "./userControls/SelfAccountRow";
import { StatusMenu } from "./userControls/StatusMenu";
import { VoiceControlPanel } from "./userControls/VoiceControlPanel";

export type UserControlsProps = {
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
}: UserControlsProps) {
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
      {statusMenuOpen ? <StatusMenu onSetStatus={setStatus} /> : null}

      {joined && room ? (
        <VoiceControlPanel
          canUseVideo={canUseVideo}
          error={error}
          roomName={room.name}
          sfuActive={sfuActive}
          sfuStatus={sfu.status}
          shareActive={shareActive}
          videoOn={videoOn}
          onLeave={() => onLeave(room.id)}
          onToggleScreenShare={toggleScreenShare}
          onToggleVideo={() => updateRoomMedia({ audio: audioOn, video: !videoOn, screen: screenOn })}
        />
      ) : null}

      {!joined && reconnectRoom ? (
        <ReconnectPrompt room={reconnectRoom} onDismiss={onDismissReconnect} onReconnect={onReconnect} />
      ) : null}

      <SelfAccountRow
        actorAvatar={actorAvatar}
        actorName={actorName}
        actorRole={actorRole}
        statusMenuOpen={statusMenuOpen}
        voicePreferences={voicePreferences}
        onOpenVoiceSettings={openVoiceSettings}
        onToggleDeafen={toggleDeafen}
        onToggleMute={toggleMute}
        onToggleStatusMenu={() => setStatusMenuOpen((open) => !open)}
      />

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
