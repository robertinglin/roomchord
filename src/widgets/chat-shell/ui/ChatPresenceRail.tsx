import React from "react";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";
import { PresencePanel } from "@features/presence/ui/PresencePanel";

export function ChatPresenceRail() {
  const { actions, live, media, view } = useChatRuntime();
  const ui = useChatUiActions();
  const memberPreferences = useChatUiStore((value) => value.memberPreferences);
  return (
    <PresencePanel
      actor={live.actor}
      roomMembers={live.state.members}
      presence={live.state.presence}
      embeds={view.embeds}
      threads={view.threadsForChannel}
      rooms={view.visibleRooms}
      screenShares={view.activeScreenShares}
      voiceTokens={media.voiceTokens}
      roleDefinitions={live.state.roleDefinitions}
      memberPreferences={memberPreferences}
      memberRoles={live.state}
      canManageRoles={view.actorCanManageRoles}
      onDirectMessage={view.actorCanDirectMessage ? actions.openDirectThreadForMember : undefined}
      onMention={ui.queueComposerText}
      onOpenMemberProfile={ui.openMemberProfileDialog}
      onSetMemberBlock={ui.setMemberBlock}
      onSetMemberIgnore={ui.setMemberIgnore}
      onSetMemberRoles={(memberId) => actions.openManageDialog("members", memberId)}
      onStartCall={view.actorCanDirectMessage ? actions.startDirectCall : undefined}
    />
  );
}
