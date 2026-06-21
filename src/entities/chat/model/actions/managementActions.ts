import type { ManagementTab } from "@entities/chat/model/managementTypes";
import type { ChannelId, MemberId, RoleId, RoomId, RoomRoleAccess } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function managementActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  async function createTextChannel(channel: { name: string; topic?: string; group?: string }) {
    await dispatch("channelCreate", channel);
  }

  async function updateTextChannel(channelId: string, channel: { name?: string; topic?: string | null; group?: string | null }) {
    await dispatch("channelRename", { channelId: channelId as ChannelId, ...channel });
  }

  async function archiveTextChannel(channelId: string) {
    await dispatch("channelArchive", { channelId: channelId as ChannelId });
  }

  async function createMediaRoom(room: { name: string; allowsVideo: boolean; group?: string; roleAccess?: RoomRoleAccess }) {
    const scoped = input.view.currentChannelId ? { scopeType: "channel", scopeId: input.view.currentChannelId } : {};
    await dispatch("mediaRoomCreate", { name: room.name, allowsVideo: room.allowsVideo, group: room.group, roleAccess: room.roleAccess, ...scoped });
  }

  async function updateMediaRoomSettings(roomId: string, settings: { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess }) {
    await dispatch("mediaRoomUpdate", { roomId: roomId as RoomId, ...settings });
  }

  async function archiveMediaRoom(roomId: string) {
    await dispatch("mediaRoomArchive", { roomId: roomId as RoomId });
  }

  async function createRole(role: { roleId: string; name: string; description?: string; color?: string }) {
    await dispatch("roleCreate", { ...role, roleId: role.roleId as RoleId });
  }

  async function updateRole(roleId: string, role: { name?: string; description?: string; color?: string }) {
    await dispatch("roleUpdate", { roleId: roleId as RoleId, ...role });
  }

  async function archiveRole(roleId: string) {
    await dispatch("roleArchive", { roleId: roleId as RoleId });
  }

  async function assignMemberRoles(memberId: string, roleIds: string[], displayName?: string) {
    await dispatch("memberRoleAssign", {
      memberId: memberId as MemberId,
      roleId: (roleIds[0] || "member") as RoleId,
      roleIds: roleIds as RoleId[],
      displayName
    });
  }

  async function moderateMember(memberId: string, moderation: { chatDisabled?: boolean; nameLocked?: boolean }) {
    await dispatch("moderateMember", {
      memberId: memberId as MemberId,
      ...moderation
    });
  }

  async function banMember(memberId: string, reason?: string) {
    await dispatch("banMember", {
      memberId: memberId as MemberId,
      reason
    });
  }

  async function unbanMember(memberId: string) {
    await dispatch("unbanMember", {
      memberId: memberId as MemberId
    });
  }

  async function disableInvite(inviteId: string) {
    await dispatch("disableInvite", { inviteId });
  }

  async function removeInvite(inviteId: string) {
    await dispatch("removeInvite", { inviteId });
  }

  async function approveJoinRequest(requestId: string) {
    await dispatch("approveJoinRequest", { requestId });
  }

  async function denyJoinRequest(requestId: string) {
    await dispatch("denyJoinRequest", { requestId });
  }

  function openManageDialog(tab: ManagementTab = "overview", memberId?: string) {
    input.ui.openManageDialog(tab, memberId);
  }

  return {
    archiveMediaRoom,
    archiveRole,
    archiveTextChannel,
    approveJoinRequest,
    banMember,
    assignMemberRoles,
    createMediaRoom,
    createRole,
    createTextChannel,
    denyJoinRequest,
    disableInvite,
    moderateMember,
    openManageDialog,
    removeInvite,
    unbanMember,
    updateMediaRoomSettings,
    updateRole,
    updateTextChannel
  };
}
