import type { ManagementTab } from "@entities/chat/model/managementTypes";
import type { ChannelId, MemberId, RoleId, RoomId, RoomRoleAccess } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

const DEFAULT_ROLE_GRANTS = [{ scopeType: "*", scopeId: "*", role: "viewer" }];
const ARCHIVED_ROLE_GRANTS = [{ scopeType: "*", scopeId: "*", role: "none" }];

export function managementActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  function scopedRole(roleId: string) {
    return (input.live.state as any).scopedRoles?.roles?.[roleId] || {};
  }

  function assignedRoleIdsForMember(memberId: string): string[] {
    const scoped = (input.live.state as any).scopedRoles?.assignments?.[memberId];
    if (Array.isArray(scoped)) return scoped;
    const legacy = input.live.state.memberRoles?.[memberId];
    return [...new Set([legacy?.roleId, ...(legacy?.roleIds || [])].filter(Boolean))] as string[];
  }

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
    await dispatch("roleCreate", { ...role, roleId: role.roleId as RoleId, synthetic: false, grants: DEFAULT_ROLE_GRANTS });
  }

  async function updateRole(roleId: string, role: { name?: string; description?: string; color?: string }) {
    const current = scopedRole(roleId);
    await dispatch("roleCreate", {
      roleId: roleId as RoleId,
      name: role.name || current.name || roleId,
      description: role.description ?? current.description,
      color: role.color ?? current.color,
      synthetic: Boolean(current.synthetic),
      grants: current.grants?.length ? current.grants : DEFAULT_ROLE_GRANTS,
      ...(current.gates ? { gates: current.gates } : {}),
      ...(current.when ? { when: current.when } : {})
    });
  }

  async function archiveRole(roleId: string) {
    const current = scopedRole(roleId);
    await dispatch("roleCreate", {
      roleId: roleId as RoleId,
      name: current.name || roleId,
      description: current.description,
      color: current.color,
      grants: current.grants?.length ? current.grants : ARCHIVED_ROLE_GRANTS,
      archivedAt: Date.now()
    });
  }

  async function assignMemberRoles(memberId: string, roleIds: string[], _displayName?: string) {
    const next = new Set(roleIds.filter(Boolean));
    const current = new Set(assignedRoleIdsForMember(memberId));
    for (const roleId of current) {
      if (!next.has(roleId)) await dispatch("memberRoleUnassign", { target: memberId, roleId: roleId as RoleId });
    }
    for (const roleId of next) {
      if (!current.has(roleId)) await dispatch("memberRoleAssign", { target: memberId, roleId: roleId as RoleId });
    }
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
