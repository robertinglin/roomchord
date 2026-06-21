import React from "react";
import { avatarForActor, canDeleteMessage, isMessageAuthor } from "@entities/chat/model/chatViewModel";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { MessageFeed } from "@features/messages/ui/MessageFeed";
import { VoiceRoomView } from "@features/voice-room/ui/VoiceRoomView";
import type { ScreenShare } from "@entities/chat/model/types";
import { useIsMobile } from "@shared/ui/useIsMobile";

function activeScreenShareForRoom(screenShares: ScreenShare[], roomId?: string) {
  if (!roomId) return undefined;
  return screenShares.find((share) => !share.stoppedAt && (share.roomId === roomId || share.scopeId === roomId));
}

export function ChatContent() {
  const { actions, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const composerFocusKey = useChatUiStore((value) => value.composerFocusKey);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);
  const isMobile = useIsMobile();

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
      currentUserId={live.actor.memberId}
      mode={view.showingDm ? "dm" : "channel"}
      feedKey={view.showingDm ? `dm:${view.currentThreadId || ""}` : `channel:${view.currentChannelId || ""}`}
      disabled={view.actorChatDisabled || (view.showingDm ? !view.currentThreadId : !view.currentChannelId)}
      onSend={(body) => view.showingDm ? actions.sendDirectMessage(body) : actions.sendChannelMessage(body)}
      onReply={view.showingDm ? undefined : actions.replyToMessage}
      onReact={view.showingDm ? undefined : actions.reactToMessage}
      onForward={actions.forwardMessage}
      onPin={view.showingDm || !view.actorCanManageRooms ? undefined : actions.pinMessage}
      onUnpin={view.showingDm || !view.actorCanManageRooms ? undefined : actions.unpinMessage}
      onDelete={view.showingDm ? undefined : actions.deleteMessage}
      onEdit={view.showingDm ? undefined : actions.editMessage}
      onDirectMessage={actions.openDirectThreadForMember}
      canDeleteMessage={(message) => canDeleteMessage(live.actor, message, live.can("messagePin"))}
      canEditMessage={(message) => isMessageAuthor(live.actor, message)}
    />
  );
}
