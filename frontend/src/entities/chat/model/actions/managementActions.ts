import type { ManagementTab } from "@entities/chat/model/managementTypes";
import type { RoomRoleAccess } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function managementActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  async function createTextChannel(channel: { name: string; topic?: string; group?: string }) {
    await dispatch("channelCreate", channel);
  }

  async function updateTextChannel(channelId: string, channel: { name?: string; topic?: string | null; group?: string | null }) {
    await dispatch("channelRename", { channelId, ...channel });
  }

  async function archiveTextChannel(channelId: string) {
    await dispatch("channelArchive", { channelId });
  }

  async function createMediaRoom(room: { name: string; allowsVideo: boolean; group?: string; roleAccess?: RoomRoleAccess }) {
    const scoped = input.view.currentChannelId ? { scopeType: "channel", scopeId: input.view.currentChannelId } : {};
    await dispatch("mediaRoomCreate", { name: room.name, allowsVideo: room.allowsVideo, group: room.group, roleAccess: room.roleAccess, ...scoped });
  }

  async function updateMediaRoomSettings(roomId: string, settings: { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess }) {
    await dispatch("mediaRoomUpdate", { roomId, ...settings });
  }

  async function archiveMediaRoom(roomId: string) {
    await dispatch("mediaRoomArchive", { roomId });
  }

  async function createRole(role: { roleId: string; name: string; description?: string; color?: string }) {
    await dispatch("roleCreate", role);
  }

  async function updateRole(roleId: string, role: { name?: string; description?: string; color?: string }) {
    await dispatch("roleUpdate", { roleId, ...role });
  }

  async function archiveRole(roleId: string) {
    await dispatch("roleArchive", { roleId });
  }

  async function assignMemberRoles(memberId: string, roleIds: string[], displayName?: string) {
    await dispatch("memberRoleAssign", { memberId, roleId: roleIds[0] || "member", roleIds, displayName });
  }

  function openManageDialog(tab: ManagementTab = "overview", memberId?: string) {
    input.ui.openManageDialog(tab, memberId);
  }

  return {
    archiveMediaRoom,
    archiveRole,
    archiveTextChannel,
    assignMemberRoles,
    createMediaRoom,
    createRole,
    createTextChannel,
    openManageDialog,
    updateMediaRoomSettings,
    updateRole,
    updateTextChannel
  };
}
