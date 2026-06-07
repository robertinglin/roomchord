import React from "react";
import { avatarForActor } from "@entities/chat/model/chatViewModel";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { ChannelSidebar } from "@features/channel-navigation/ui/ChannelSidebar";
import { DirectMessages } from "@features/direct-messages/ui/DirectMessages";
import { UserControls } from "@features/user-controls/ui/UserControls";
import { CloseIcon } from "@shared/ui/Icons";

export function ChatSidebar({
  onClose,
  onNavigate
}: {
  onClose?: () => void;
  onNavigate?: () => void;
}) {
  const { actions, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const activeView = useChatUiStore((value) => value.activeView);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  function closeSidebar() {
    onClose?.();
  }

  function handleNavigate() {
    onNavigate?.();
  }

  return (
    <aside className="room-sidebar" aria-label="Room navigation">
      <header className="room-sidebar-header">
        <button
          className="chat-sidebar-close-button"
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
        >
          <CloseIcon />
        </button>
        <div>
          <h1>Chord</h1>
          <p>{view.roomLabel}</p>
        </div>
        <span className="room-sidebar-actions">
          <span className={`connection-state ${live.status}`}>{live.status}</span>
          {view.actorCanManageAnything ? (
            <button
              className="sidebar-manage-button"
              type="button"
              onClick={() => {
                actions.openManageDialog("overview");
                handleNavigate();
              }}
            >
              Manage
            </button>
          ) : null}
        </span>
      </header>

      <ChannelSidebar
        channels={view.channels}
        activeChannelId={activeView === "channel" ? view.currentChannelId : undefined}
        canCreateChannels={view.actorCanCreateChannels}
        voice={{
          state: live.state,
          activeRoomId: view.joinedRoomId,
          selectedRoomId: view.showingMediaRoom ? view.selectedMediaRoom?.id : undefined,
          voiceTokens: media.voiceTokens,
          canManageRooms: view.actorCanManageRooms,
          currentUserId: live.actor.memberId,
          currentRoleIds: view.actorRoleIds,
          mutedVoiceParticipantIds,
          onCreate: (input) => actions.createMediaRoom({ name: input.name, group: input.group, allowsVideo: true }),
          onDirectMessage: (memberId) => {
            actions.openDirectThreadForMember(memberId);
            handleNavigate();
          },
          onJoin: (room, media) => {
            actions.selectMediaRoom(room, media);
            handleNavigate();
          },
          onToggleVoiceParticipantMute: ui.toggleVoiceParticipantMute
        }}
        onCreateChannel={actions.createTextChannel}
        onSelect={(channelId) => {
          ui.selectChannel(channelId);
          handleNavigate();
        }}
      />

      <DirectMessages
        threads={view.threads}
        activeThreadId={view.showingDm ? view.currentThreadId : undefined}
        currentUserId={live.actor.memberId}
        memberNamesById={view.memberNamesById}
        memberAvatarsById={view.memberAvatarsById}
        unreadCounts={view.unreadCounts}
        onSelect={(threadId) => {
          ui.selectDirectThread(threadId);
          handleNavigate();
        }}
        onClose={(threadId) => {
          actions.closeDirectThread(threadId);
          handleNavigate();
        }}
      />

      <UserControls
        actorName={view.actorName}
        actorAvatar={avatarForActor(live.actor)}
        actorRole={live.actor.role}
        rooms={view.visibleRooms}
        selectedRoomId={view.selectedMediaRoom?.id}
        joinedRoomId={view.joinedRoomId}
        localMedia={localMediaSettings}
        sfu={media.sfu}
        error={media.error}
        voicePreferences={voicePreferences}
        reconnectRoom={view.reconnectRoom}
        screenShares={view.activeScreenShares}
        onUpdateMedia={actions.updateMediaRoom}
        onLeave={(roomId) => { void actions.leaveMediaRoom(roomId); }}
        onReconnect={actions.reconnectVoiceRoom}
        onDismissReconnect={ui.dismissReconnect}
        onStopShare={(shareId) => { void actions.stopScreenShare(shareId); }}
        hideVoicePanel={activeView === "media"}
        onUpdateVoicePreferences={ui.updateVoicePreferences}
        onVoiceSettingsOpenChange={ui.setVoiceSettingsOpen}
        onUpdateStatus={actions.updatePresence}
      />
    </aside>
  );
}
