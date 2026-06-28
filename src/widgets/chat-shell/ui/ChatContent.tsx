import React from "react";
import type { DirectCallState } from "matterhorn-sdk/browser/types";
import { avatarForActor, canDeleteMessage, isMessageAuthor } from "@entities/chat/model/chatViewModel";
import { directCallCanRenderRoom, directCallMatchesThread } from "@entities/chat/model/directCallThreads";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { MessageFeed } from "@features/messages/ui/MessageFeed";
import { VoiceRoomView } from "@features/voice-room/ui/VoiceRoomView";
import type { MediaRoom, RoomId, ScreenShare } from "@entities/chat/model/types";
import { useIsMobile } from "@shared/ui/useIsMobile";

function activeScreenShareForRoom(screenShares: ScreenShare[], roomId?: string) {
  if (!roomId) return undefined;
  return screenShares.find((share) => !share.stoppedAt && (share.roomId === roomId || share.scopeId === roomId));
}

function directCallRoom(call: DirectCallState, title: string): MediaRoom | undefined {
  if (!call.directRoomId) return undefined;
  return {
    archivedAt: null,
    group: null,
    id: call.directRoomId as RoomId,
    name: title,
    allowsVideo: true,
    locked: false,
    participantCount: call.room?.remoteStreams.length || 0,
    participants: {},
    roleAccess: {},
  };
}

export function ChatContent() {
  const { actions, directCalls, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const composerFocusKey = useChatUiStore((value) => value.composerFocusKey);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);
  const pendingComposerText = useChatUiStore((value) => value.pendingComposerText);
  const isMobile = useIsMobile();
  const directCall = directCalls.state;
  const directRoom = directCallRoom(directCall, view.showingDm ? view.feedTitle : directCall.remoteName || "Direct call");
  const showingActiveDirectCall = Boolean(
    directRoom
    && view.activeThread
    && directCallCanRenderRoom(directCall.status)
    && directCallMatchesThread(view.activeThread, live.actor.memberId, directCalls.memberIds)
  );

  if (showingActiveDirectCall && directRoom) {
    const directMedia = directCall.media || localMediaSettings;
    const videoOn = Boolean(directMedia.video);
    const audioOn = !view.effectiveVoicePreferences.muted && !view.effectiveVoicePreferences.deafened;
    const screenOn = Boolean(directMedia.screen);

    function toggleScreenShare() {
      directCalls.updateMedia({ audio: audioOn, video: videoOn, screen: !screenOn });
    }

    function toggleVideo() {
      directCalls.updateMedia({ audio: audioOn, video: !videoOn, screen: screenOn });
    }

    return (
      <VoiceRoomView
        actorId={directCalls.clientId}
        actorName={view.actorName}
        actorAvatar={avatarForActor(live.actor)}
        joinedRoomId={directRoom.id}
        localMedia={directMedia}
        room={directRoom}
        sfu={directCall.room || { status: directCall.status === "idle" ? "idle" : "connecting", mediaRoomId: directRoom.id, remoteStreams: [] }}
        voicePreferences={view.effectiveVoicePreferences}
        voiceTokens={[]}
        mutedVoiceParticipantIds={mutedVoiceParticipantIds}
        showSidebarMenu={true}
        onOpenMenu={() => ui.setSidebarOpen(true)}
        onLeaveVoiceRoom={directCalls.endCall}
        onToggleVoiceScreenShare={toggleScreenShare}
        voiceControlShowScreenShare={!isMobile}
        onToggleVoiceVideo={toggleVideo}
        voiceControlCanUseVideo={true}
        voiceControlCanSwapCamera={false}
        voiceControlSfuActive={directCall.status === "connecting" || directCall.status === "connected"}
        voiceControlSfuStatus={directCall.status}
        voiceControlShareActive={screenOn}
        voiceControlVideoOn={videoOn}
        voiceControlError={directCalls.error}
        onDirectMessage={actions.openDirectThreadForMember}
        onStopWatchingScreenShare={directCalls.stopWatchingScreenShare}
        onToggleVoiceParticipantMute={ui.toggleVoiceParticipantMute}
        onWatchScreenShare={directCalls.watchScreenShare}
      />
    );
  }

  if (view.showingMediaRoom && view.selectedMediaRoom) {
    const room = view.selectedMediaRoom;
    const joined = view.joinedRoomId === room.id;
    const roomSfuActive = media.sfu.mediaRoomId === room.id;
    const sfuActive = roomSfuActive && (media.sfu.status === "connected" || media.sfu.status === "connecting");
    const activeMedia = sfuActive ? media.sfu.media : localMediaSettings;
    const videoOn = Boolean(activeMedia?.video);
    const audioOn = !view.effectiveVoicePreferences.muted && !view.effectiveVoicePreferences.deafened;
    const screenOn = Boolean(activeMedia?.screen);
    const share = activeScreenShareForRoom(view.activeScreenShares, room.id);
    const shareActive = screenOn || Boolean(share);

    function toggleScreenShare() {
      if (!joined) return;
      if (!screenOn && share) {
        void actions.stopScreenShare(share.id);
        return;
      }
      void media.updateRoomMedia(room, { audio: audioOn, video: videoOn, screen: !screenOn });
    }

    function toggleVideo() {
      if (!joined) return;
      void media.updateRoomMedia(room, { audio: audioOn, video: !videoOn, screen: screenOn });
    }

    return (
      <VoiceRoomView
        actorId={live.actor.memberId}
        actorName={view.actorName}
        actorAvatar={avatarForActor(live.actor)}
        joinedRoomId={view.joinedRoomId}
        localMedia={localMediaSettings}
        room={view.selectedMediaRoom}
        sfu={media.sfu}
        voicePreferences={view.effectiveVoicePreferences}
        voiceTokens={media.voiceTokens}
        mutedVoiceParticipantIds={mutedVoiceParticipantIds}
        showSidebarMenu={true}
        onOpenMenu={() => ui.setSidebarOpen(true)}
        onLeaveVoiceRoom={() => actions.leaveMediaRoom(room.id)}
        onToggleVoiceCameraSwap={media.canSwapCamera ? () => media.toggleCameraFacing() : undefined}
        onToggleVoiceScreenShare={toggleScreenShare}
        voiceControlShowScreenShare={!isMobile}
        onToggleVoiceVideo={toggleVideo}
        voiceControlCanUseVideo={joined && room.allowsVideo !== false}
        voiceControlCanSwapCamera={media.canSwapCamera}
        voiceControlSfuActive={sfuActive}
        voiceControlSfuStatus={media.sfu.status}
        voiceControlShareActive={shareActive}
        voiceControlVideoOn={videoOn}
        voiceControlError={media.error}
        onDirectMessage={actions.openDirectThreadForMember}
        onStopWatchingScreenShare={media.stopWatchingScreenShare}
        onToggleVoiceParticipantMute={ui.toggleVoiceParticipantMute}
        onWatchScreenShare={media.watchScreenShare}
      />
    );
  }

  return (
    <MessageFeed
      title={view.feedTitle}
      subtitle={view.feedSubtitle}
      messages={view.feedMessages}
      memberNamesById={view.memberNamesById}
      memberAvatarsById={view.memberAvatarsById}
      forwardTargets={view.forwardTargets}
      focusKey={composerFocusKey > 0 ? composerFocusKey : undefined}
      pendingComposerText={pendingComposerText}
      currentUserId={live.actor.memberId}
      mode={view.showingDm ? "dm" : "channel"}
      feedKey={view.showingDm ? `direct.thread:${view.currentThreadId || ""}` : `channel:${view.currentChannelId || ""}`}
      disabled={view.actorChatDisabled || (view.showingDm ? !view.currentThreadId : !view.currentChannelId)}
      onSend={(body) => view.showingDm ? actions.sendDirectMessage(body) : actions.sendChannelMessage(body)}
      onReply={view.showingDm ? undefined : actions.replyToMessage}
      onReact={view.showingDm ? undefined : actions.reactToMessage}
      onForward={actions.forwardMessage}
      onPin={view.showingDm || live.actor.role === "member" || !live.can("messagePin") ? undefined : actions.pinMessage}
      onUnpin={view.showingDm || live.actor.role === "member" || !live.can("messagePin") ? undefined : actions.unpinMessage}
      onDelete={view.showingDm ? undefined : actions.deleteMessage}
      onEdit={view.showingDm ? undefined : actions.editMessage}
      onDirectMessage={actions.openDirectThreadForMember}
      canDeleteMessage={(message) => canDeleteMessage(live.actor, message, live.can("messagePin"))}
      canEditMessage={(message) => isMessageAuthor(live.actor, message)}
    />
  );
}
