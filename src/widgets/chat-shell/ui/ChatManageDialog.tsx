import React from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { mediaWithVoicePreferences, type VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { ManageOverviewDialog } from "@features/management/ui/ManageOverviewDialog";

export function ChatManageDialog() {
  const { actions, live, media, view, roomName } = useChatRuntime();
  const ui = useChatUiActions();
  const manageDialog = useChatUiStore((value) => value.manageDialog);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  const mediaBeforeSettings = React.useRef<CallMediaSettings | undefined>(undefined);
  const latestVoicePreferences = React.useRef(voicePreferences);
  const audioSettingsOpen = manageDialog?.tab === "audio";
  const activeVoiceRoom = view.visibleRooms.find((room) => room.id === (media.sfu.mediaRoomId || view.joinedRoomId || view.selectedMediaRoom?.id));
  const activeMedia = media.sfu.mediaRoomId === activeVoiceRoom?.id && (media.sfu.status === "connected" || media.sfu.status === "connecting")
    ? media.sfu.media
    : localMediaSettings;

  function suspendedVoiceSettingsMedia(preferences: VoicePreferences): CallMediaSettings {
    const restore = mediaBeforeSettings.current || activeMedia;
    return mediaWithVoicePreferences({
      audio: false,
      video: restore ? Boolean(restore.video) : false,
      screen: restore ? Boolean(restore.screen) : false
    }, preferences);
  }

  function restoredVoiceSettingsMedia(preferences: VoicePreferences): CallMediaSettings {
    const restore = mediaBeforeSettings.current || activeMedia;
    return mediaWithVoicePreferences({
      audio: (restore ? restore.audio !== false : true) && !preferences.muted && !preferences.deafened,
      video: restore ? Boolean(restore.video) : false,
      screen: restore ? Boolean(restore.screen) : false
    }, preferences);
  }

  function updateVoicePreferences(preferences: VoicePreferences) {
    latestVoicePreferences.current = preferences;
    ui.updateVoicePreferences(preferences);
    if (!activeVoiceRoom) return;
    actions.updateMediaRoom(
      activeVoiceRoom,
      audioSettingsOpen ? suspendedVoiceSettingsMedia(preferences) : restoredVoiceSettingsMedia(preferences)
    );
  }

  React.useEffect(() => {
    latestVoicePreferences.current = voicePreferences;
  }, [voicePreferences]);

  React.useEffect(() => {
    ui.setVoiceSettingsOpen(Boolean(audioSettingsOpen));
    if (!audioSettingsOpen || !activeVoiceRoom) {
      if (mediaBeforeSettings.current && activeVoiceRoom) {
        actions.updateMediaRoom(activeVoiceRoom, restoredVoiceSettingsMedia(latestVoicePreferences.current));
        mediaBeforeSettings.current = undefined;
      }
      return () => undefined;
    }
    if (!mediaBeforeSettings.current) {
      mediaBeforeSettings.current = activeMedia ? { ...activeMedia } : restoredVoiceSettingsMedia(latestVoicePreferences.current);
      actions.updateMediaRoom(activeVoiceRoom, suspendedVoiceSettingsMedia(latestVoicePreferences.current));
    }
    return () => {
      ui.setVoiceSettingsOpen(false);
      if (!mediaBeforeSettings.current) return;
      actions.updateMediaRoom(activeVoiceRoom, restoredVoiceSettingsMedia(latestVoicePreferences.current));
      mediaBeforeSettings.current = undefined;
    };
  }, [audioSettingsOpen, activeVoiceRoom?.id]);

  if (!manageDialog) return null;
  return (
    <ManageOverviewDialog
      actor={live.actor}
      state={live.state}
      roomName={roomName}
      canCreateChannels={view.actorCanCreateChannels}
      canManageMembers={view.actorCanManageMembers}
      canManageRooms={view.actorCanManageRooms}
      canManageRoles={view.actorCanManageRoles}
      initialTab={manageDialog.tab}
      initialMemberId={manageDialog.memberId}
      voicePreferences={voicePreferences}
      onClose={ui.closeManageDialog}
      onCreateChannel={actions.createTextChannel}
      onUpdateChannel={actions.updateTextChannel}
      onArchiveChannel={actions.archiveTextChannel}
      onCreateRoom={actions.createMediaRoom}
      onUpdateRoom={actions.updateMediaRoomSettings}
      onArchiveRoom={actions.archiveMediaRoom}
      onCreateRole={actions.createRole}
      onUpdateRole={actions.updateRole}
      onArchiveRole={actions.archiveRole}
      onAssignMemberRoles={actions.assignMemberRoles}
      onApproveJoinRequest={actions.approveJoinRequest}
      onBanMember={actions.banMember}
      onDenyJoinRequest={actions.denyJoinRequest}
      onDisableInvite={actions.disableInvite}
      onModerateMember={actions.moderateMember}
      onRemoveInvite={actions.removeInvite}
      onUnbanMember={actions.unbanMember}
      onUpdateVoicePreferences={updateVoicePreferences}
    />
  );
}
