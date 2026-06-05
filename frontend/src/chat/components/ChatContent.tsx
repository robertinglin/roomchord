import React from "react";
import { avatarForActor, canDeleteMessage, isMessageAuthor } from "../chatViewModel";
import { useChatRuntime } from "../chatRuntime";
import { useChatUiActions, useChatUiStore } from "../chatUiStore";
import { MessageFeed } from "./MessageFeed";
import { VoiceRoomView } from "./VoiceRoomView";

export function ChatContent() {
  const { actions, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const composerFocusKey = useChatUiStore((value) => value.composerFocusKey);
  const localMediaSettings = useChatUiStore((value) => value.localMediaSettings);
  const mutedVoiceParticipantIds = useChatUiStore((value) => value.mutedVoiceParticipantIds);

  if (view.showingMediaRoom && view.selectedMediaRoom) {
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
      focusKey={composerFocusKey}
      currentUserId={live.actor.memberId}
      mode={view.showingDm ? "dm" : "channel"}
      disabled={view.showingDm ? !view.currentThreadId : !view.currentChannelId}
      onSend={(body) => view.showingDm ? actions.sendDirectMessage(body) : actions.sendChannelMessage(body)}
      onReply={view.showingDm ? undefined : actions.replyToMessage}
      onReact={view.showingDm ? undefined : actions.reactToMessage}
      onForward={actions.forwardMessage}
      onPin={view.showingDm || !view.actorCanManageRooms ? undefined : actions.pinMessage}
      onUnpin={view.showingDm || !view.actorCanManageRooms ? undefined : actions.unpinMessage}
      onDelete={view.showingDm ? undefined : actions.deleteMessage}
      onEdit={view.showingDm ? undefined : actions.editMessage}
      onDirectMessage={actions.openDirectThreadForMember}
      canDeleteMessage={(message) => canDeleteMessage(live.actor, message)}
      canEditMessage={(message) => isMessageAuthor(live.actor, message)}
    />
  );
}
