import type { ManagementTab } from "@entities/chat/model/managementTypes";
import type { ChannelId, MemberId, RoleId, RoomId, RoomRoleAccess } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";
import { assignedRoleIds } from "@entities/chat/model/roles";
import { publicInvitesForState } from "@entities/chat/model/state";

const DEFAULT_ROLE_RULES = [{ scopeType: "channel", scopeId: "*", level: "viewer", allowOperations: [], denyOperations: [] }];
const MEMBER_ROOM_ACCESS: RoomRoleAccess = {
  member: "editor",
  moderator: "editor",
  admin: "editor",
  owner: "editor"
} as RoomRoleAccess;
const GUEST_ROOM_ACCESS: RoomRoleAccess = {
  guest: "readonly",
  ...MEMBER_ROOM_ACCESS
} as RoomRoleAccess;
type ScopedRoleRecord = {
  roleId?: string;
  generation?: number;
  revision?: number;
  definitionHash?: string;
  name?: string;
  description?: string;
  color?: string;
  rules?: unknown[];
};

export function managementActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  function scopedRole(roleId: string) {
    const roles = (input.live.state as typeof input.live.state & {
      scopedRoles?: { roles?: Record<string, ScopedRoleRecord> };
    }).scopedRoles?.roles;
    return roles?.[roleId] || Object.values(input.live.state.roleDefinitions || {}).find((role) => role.id === roleId);
  }

  function assignedRoleIdsForMember(memberId: string): string[] {
    return assignedRoleIds(memberId, undefined, input.live.state);
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
    const scoped = { scopeType: "channel", scopeId: input.view.currentChannelId || "general" };
    const roleAccess = room.roleAccess
      || (input.view.currentChannelId === "guest" ? GUEST_ROOM_ACCESS : MEMBER_ROOM_ACCESS);
    await dispatch("mediaRoomCreate", { name: room.name, allowsVideo: room.allowsVideo, group: room.group, roleAccess, ...scoped });
  }

  async function updateMediaRoomSettings(roomId: string, settings: { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess }) {
    await dispatch("mediaRoomUpdate", { roomId: roomId as RoomId, ...settings });
  }

  async function archiveMediaRoom(roomId: string) {
    await dispatch("mediaRoomArchive", { roomId: roomId as RoomId });
  }

  async function createRole(role: { roleId: string; name: string; description?: string; color?: string }) {
    await dispatch("roleCreate", { ...role, roleId: role.roleId as RoleId, rules: DEFAULT_ROLE_RULES });
  }

  async function updateRole(roleId: string, role: { name?: string; description?: string; color?: string }) {
    const current = scopedRole(roleId);
    const scoped = current as ScopedRoleRecord | undefined;
    if (!scoped?.generation || !scoped.revision || !scoped.definitionHash) return;
    await dispatch("roleUpdate", {
      roleId: roleId as RoleId,
      generation: scoped.generation,
      revision: scoped.revision,
      previousHash: scoped.definitionHash,
      name: role.name || scoped.name || roleId,
      description: role.description ?? scoped.description,
      color: role.color ?? scoped.color,
      rules: scoped.rules || DEFAULT_ROLE_RULES
    });
  }

  async function archiveRole(roleId: string) {
    const current = scopedRole(roleId);
    const scoped = current as ScopedRoleRecord | undefined;
    if (!scoped?.generation) return;
    await dispatch("roleTombstone", {
      roleId: roleId as RoleId,
      generation: scoped.generation,
      reason: "Role retired"
    });
  }

  async function assignMemberRoles(memberId: string, roleIds: string[], _displayName?: string) {
    const systemRoles = ["guest", "member", "moderator", "admin", "owner"] as const;
    const isSystemRole = (roleId: string): roleId is typeof systemRoles[number] =>
      systemRoles.includes(roleId as typeof systemRoles[number]);
    const next = new Set(roleIds.filter(Boolean));
    const nextCustom = new Set([...next].filter((roleId) => !isSystemRole(roleId)));
    const nextSystemRole = [...systemRoles].reverse().find((roleId) => next.has(roleId)) || "member";
    const managementSnapshot = await input.live.management.getSnapshot();
    const authorityRoleIds = managementSnapshot.members.find((member) => member.memberId === memberId)?.roleIds || [];
    const currentRoleIds = new Set([...assignedRoleIdsForMember(memberId), ...authorityRoleIds]);
    const current = new Set([...currentRoleIds].filter((roleId) => !isSystemRole(roleId)));
    const currentSystemRole = [...systemRoles].reverse().find((roleId) => currentRoleIds.has(roleId));
    if (nextSystemRole !== currentSystemRole) {
      await input.live.management.members.setRoles(memberId, [nextSystemRole]);
    }
    for (const roleId of current) {
      if (!nextCustom.has(roleId)) {
        const role = scopedRole(roleId);
        const scoped = role as ScopedRoleRecord | undefined;
        if (scoped?.generation) await dispatch("memberRoleUnassign", { memberId, roleId: roleId as RoleId, generation: scoped.generation });
      }
    }
    for (const roleId of nextCustom) {
      if (!current.has(roleId)) {
        const role = scopedRole(roleId);
        const scoped = role as ScopedRoleRecord | undefined;
        if (scoped?.generation) await dispatch("memberRoleAssign", { memberId, roleId: roleId as RoleId, generation: scoped.generation });
      }
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
    if (publicInvitesForState(input.live.state).some((invite) => invite.id === inviteId)) {
      await dispatch("disableInvite", { inviteId });
      return;
    }
    const managementSnapshot = await input.live.management.getSnapshot();
    if (managementSnapshot.invites.some((invite) => invite.id === inviteId)) {
      await input.live.management.invites.remove(inviteId);
      return;
    }
    await dispatch("disableInvite", { inviteId });
  }

  async function removeInvite(inviteId: string) {
    if (publicInvitesForState(input.live.state).some((invite) => invite.id === inviteId)) {
      await dispatch("removeInvite", { inviteId });
      return;
    }
    const managementSnapshot = await input.live.management.getSnapshot();
    if (managementSnapshot.invites.some((invite) => invite.id === inviteId)) {
      try {
        await input.live.management.invites.remove(inviteId);
        return;
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("not available")) throw error;
      }
    }
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
