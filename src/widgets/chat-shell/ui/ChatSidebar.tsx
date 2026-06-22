import React from "react";
import { avatarForActor } from "@entities/chat/model/chatViewModel";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { ChannelSidebar } from "@features/channel-navigation/ui/ChannelSidebar";
import { DirectMessages } from "@features/direct-messages/ui/DirectMessages";
import { UserControls } from "@features/user-controls/ui/UserControls";
import { MtnHome } from "matterhorn-sdk/react";
import type { ChatProps } from "@entities/chat/model/types";
import chordIconSvg from "../../../../icon.svg?raw";
import { Button, Sidebar } from "@shared/ui/design";
import { CloseGlyph, GearGlyph } from "@shared/ui/design/icons";
import { useIsMobile } from "@shared/ui/useIsMobile";

/** Map the live connection status to the design kit's dot tone. */
function statusTone(status: string): "on" | "warn" | "off" {
  if (status === "connected" || status === "online") return "on";
  if (status === "reconnecting" || status === "connecting" || status === "joining") return "warn";
  return "off";
}

export function ChatSidebar({
  launchHome,
  onClose,
  onNavigate,
  onOpenLaunchHomeRoom
}: {
  launchHome?: ChatProps["launchHome"];
  onClose?: () => void;
  onNavigate?: () => void;
  onOpenLaunchHomeRoom?: ChatProps["onOpenLaunchHomeRoom"];
}) {
  const { actions, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const activeView = useChatUiStore((value) => value.activeView);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  const isMobile = useIsMobile();
  const sidebarOpen = useChatUiStore((value) => value.sidebarOpen);
  function closeSidebar() {
    onClose?.();
  }

  function handleNavigate() {
    onNavigate?.();
  }

  return (
    <Sidebar
      appName="Mosh"
      statusLabel={view.roomLabel}
      tone={statusTone(live.status)}
      searchPlaceholder="Find or start a conversation"
      showSearch={true}
      showPill={true}
      open={sidebarOpen}
      closeButton={isMobile ? (
        <Button tone="muted" title="Close navigation" onClick={closeSidebar} aria-label="Close navigation">
          <CloseGlyph size={16} />
        </Button>
      ) : null}
      homeButton={launchHome ? (
        <MtnHome
          home={launchHome}
          theme="dark"
          buttonVariant="plain"
          onOpenRoom={(detail) => {
            onOpenLaunchHomeRoom?.(detail);
            handleNavigate();
          }}
        >
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: chordIconSvg }} />
        </MtnHome>
      ) : undefined}
      manageButton={
        view.actorCanManageAnything ? (
          <Button
            tone="quiet"
            title="Manage"
            aria-label="Manage"
            onClick={() => {
              actions.openManageDialog("overview");
              handleNavigate();
            }}
          >
            <GearGlyph size={16} />
          </Button>
        ) : null
      }
      groups={
        <>
          <ChannelSidebar
            channels={view.channels}
            activeChannelId={activeView === "channel" ? view.currentChannelId : undefined}
            canCreateChannels={view.actorCanCreateChannels}
            unreadCounts={view.topicUnreadCounts}
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
        </>
      }
      user={
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
          onUpdateVoicePreferences={ui.updateVoicePreferences}
          onVoiceSettingsOpenChange={ui.setVoiceSettingsOpen}
          onUpdateStatus={actions.updatePresence}
        />
      }
    />
  );
}
