import React from "react";
import { useChatRuntime } from "@entities/chat/model/chatRuntime";
import { PresencePanel } from "@features/presence/ui/PresencePanel";

export function ChatPresenceRail() {
  const { actions, live, media, view } = useChatRuntime();
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
      memberRoles={live.state.memberRoles}
      canManageRoles={view.actorCanManageRoles}
      onDirectMessage={actions.openDirectThreadForMember}
      onSetMemberRoles={(memberId) => actions.openManageDialog("members", memberId)}
    />
  );
}
