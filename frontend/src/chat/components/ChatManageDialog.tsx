import React from "react";
import { useChatRuntime } from "../chatRuntime";
import { useChatUiActions, useChatUiStore } from "../chatUiStore";
import { ManageOverviewDialog } from "./ManageOverviewDialog";

export function ChatManageDialog() {
  const { actions, live, view } = useChatRuntime();
  const ui = useChatUiActions();
  const manageDialog = useChatUiStore((value) => value.manageDialog);
  if (!manageDialog) return null;
  return (
    <ManageOverviewDialog
      actor={live.actor}
      state={live.state}
      canCreateChannels={view.actorCanCreateChannels}
      canManageRooms={view.actorCanManageRooms}
      canManageRoles={view.actorCanManageRoles}
      initialTab={manageDialog.tab}
      initialMemberId={manageDialog.memberId}
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
    />
  );
}
