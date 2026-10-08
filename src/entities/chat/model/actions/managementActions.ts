import type { InviteInput, ManagementTab } from "@entities/chat/model/managementTypes";
import type { ChannelId, ChannelVisibility, MemberId, RoleId, RoomId, RoomRoleAccess } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";
import { assignedRoleIds } from "@entities/chat/model/roles";
import { publicInvitesForState } from "@entities/chat/model/state";

const DEFAULT_ROLE_RULES: unknown[] = [{
  scopeType: "*",
  scopeId: "*",
  level: "none",
  allowOperations: [],
  denyOperations: []
}];
const ROLE_MANAGEMENT_OPERATION_PREFIXES = ["access.role.", "scope.member."];
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

function roleRulesWithoutManagementOperations(rules: unknown[] | undefined): unknown[] {
  const sanitized = (rules || []).map((rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) return rule;
    const value = rule as { allowOperations?: unknown[]; denyOperations?: unknown[] };
    const allowed = (operations: unknown[] | undefined) => (operations || []).filter((operation) => typeof operation === "string" && !ROLE_MANAGEMENT_OPERATION_PREFIXES.some((prefix) => operation.startsWith(prefix)));
    return { ...rule, allowOperations: allowed(value.allowOperations), denyOperations: allowed(value.denyOperations) };
  });
  return sanitized.length ? sanitized : DEFAULT_ROLE_RULES;
}

export function managementActions(input: ChatActionHandlersInput) {
  const { dispatch } = input.live;

  function resourceId(prefix: string) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  function requireRoleAdministrator() {
    if (input.live.actor.role !== "admin" && input.live.actor.role !== "owner") {
      throw new Error("Role management requires an administrator role.");
    }
  }

  function scopedRole(roleId: string) {
    const roles = (input.live.state as typeof input.live.state & {
      scopedRoles?: { roles?: Record<string, ScopedRoleRecord> };
    }).scopedRoles?.roles;
    return roles?.[roleId] || Object.values(input.live.state.roleDefinitions || {}).find((role) => role.id === roleId);
  }

  function assignedRoleIdsForMember(memberId: string): string[] {
    return assignedRoleIds(memberId, undefined, input.live.state);
  }

  async function createCategory(category: { name: string; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) {
    requireRoleAdministrator();
    const isPrivate = category.visibility === "private";
    await dispatch("categoryCreate", {
      categoryId: resourceId("category"),
      ...category,
      allowedRoleIds: isPrivate ? [...new Set(["admin", "owner", ...(category.allowedRoleIds || [])])] : [],
      allowedMemberIds: isPrivate ? category.allowedMemberIds || [] : []
    });
  }

  async function updateCategory(categoryId: string, category: { name?: string; position?: number }) {
    requireRoleAdministrator();
    await dispatch("categoryUpdate", { categoryId, ...category });
  }

  async function reorderCategory(categoryId: string, position: number) {
    requireRoleAdministrator();
    await dispatch("categoryReorder", { categoryId, position });
  }

  async function archiveCategory(categoryId: string) {
    requireRoleAdministrator();
    for (const channel of input.live.state.channels.filter((item) => item.categoryId === categoryId && !item.archivedAt)) {
      await updateTextChannel(channel.id, { categoryId: null });
    }
    await dispatch("categoryArchive", { categoryId });
  }

  async function createTextChannel(channel: { name: string; topic?: string; group?: string; categoryId?: string; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) {
    const channelId = resourceId("channel");
    const isPrivate = channel.visibility === "private";
    const allowedRoleIds = isPrivate ? [...new Set(["admin", "owner", ...(channel.allowedRoleIds || [])])] : [];
    if (channel.categoryId) {
      await dispatch("scopeParentSet", { scopeType: "channel", scopeId: channelId, parentScopeType: "category", parentScopeId: channel.categoryId });
    }
    try {
      await dispatch("channelCreate", { channelId, ...channel, requiredRole: isPrivate ? "__private__" : "member", allowedRoleIds, allowedMemberIds: channel.allowedMemberIds || [] });
    } catch (error) {
      if (channel.categoryId) await dispatch("scopeParentRemove", { scopeType: "channel", scopeId: channelId }).catch(() => undefined);
      throw error;
    }
    return channelId;
  }

  async function updateTextChannel(channelId: string, channel: { name?: string; topic?: string | null; group?: string | null; categoryId?: string | null; position?: number; visibility?: ChannelVisibility; allowedRoleIds?: string[]; allowedMemberIds?: string[] }) {
    const current = input.live.state.channels.find((item) => item.id === channelId);
    const currentCategoryId = current?.categoryId || null;
    const visibility = channel.visibility ?? current?.visibility ?? "public";
    const isPrivate = visibility === "private";
    const allowedRoleIds = channel.allowedRoleIds ?? current?.allowedRoleIds ?? [];
    const allowedMemberIds = channel.allowedMemberIds ?? current?.allowedMemberIds ?? [];
    const changesParent = channel.categoryId !== undefined && channel.categoryId !== currentCategoryId;
    if (changesParent) {
      if (channel.categoryId) await dispatch("scopeParentSet", { scopeType: "channel", scopeId: channelId, parentScopeType: "category", parentScopeId: channel.categoryId });
      else await dispatch("scopeParentRemove", { scopeType: "channel", scopeId: channelId });
    }
    try {
      await dispatch("channelRename", {
        channelId: channelId as ChannelId,
        name: channel.name ?? current?.name,
        topic: channel.topic !== undefined ? channel.topic : current?.topic ?? null,
        group: channel.group !== undefined ? channel.group : current?.group ?? null,
        categoryId: channel.categoryId !== undefined ? channel.categoryId : currentCategoryId,
        position: channel.position ?? current?.position ?? 0,
        visibility,
        requiredRole: isPrivate ? "__private__" : "member",
        allowedRoleIds: isPrivate ? [...new Set(["admin", "owner", ...allowedRoleIds])] : [],
        allowedMemberIds: isPrivate ? allowedMemberIds : []
      });
    } catch (error) {
      if (changesParent) {
        if (currentCategoryId) await dispatch("scopeParentSet", { scopeType: "channel", scopeId: channelId, parentScopeType: "category", parentScopeId: currentCategoryId }).catch(() => undefined);
        else await dispatch("scopeParentRemove", { scopeType: "channel", scopeId: channelId }).catch(() => undefined);
      }
      throw error;
    }
  }

  async function archiveTextChannel(channelId: string) {
    await dispatch("channelArchive", { channelId: channelId as ChannelId });
  }

  async function createVoiceTextChannel(input: { roomId: string; name: string; categoryId?: string }) {
    const channelId = await createTextChannel({
      name: input.name,
      topic: `Text chat for ${input.name.replace(/ Chat$/, "")}`,
      categoryId: input.categoryId
    });
    try {
      await dispatch("channelVoiceTextBind", { channelId, mediaRoomId: input.roomId });
    } catch (error) {
      await archiveTextChannel(channelId).catch(() => undefined);
      if (input.categoryId) await dispatch("scopeParentRemove", { scopeType: "channel", scopeId: channelId }).catch(() => undefined);
      throw error;
    }
    return channelId;
  }

  async function reorderTextChannel(channelId: string, categoryId: string, position: number) {
    const currentCategoryId = input.live.state.channels.find((item) => item.id === channelId)?.categoryId || null;
    const changesParent = categoryId !== currentCategoryId;
    if (changesParent) {
      await dispatch("scopeParentSet", { scopeType: "channel", scopeId: channelId, parentScopeType: "category", parentScopeId: categoryId });
    }
    try {
      await dispatch("channelReorder", { channelId: channelId as ChannelId, categoryId, position });
    } catch (error) {
      if (changesParent) {
        if (currentCategoryId) await dispatch("scopeParentSet", { scopeType: "channel", scopeId: channelId, parentScopeType: "category", parentScopeId: currentCategoryId }).catch(() => undefined);
        else await dispatch("scopeParentRemove", { scopeType: "channel", scopeId: channelId }).catch(() => undefined);
      }
      throw error;
    }
  }

  async function setChannelPinned(kind: "channel" | "voice", channelId: string, pinned: boolean) {
    requireRoleAdministrator();
    const pinId = `${kind}:${channelId}`;
    await dispatch(pinned ? "channelPin" : "channelUnpin", {
      pinId,
      channelId,
      channelKind: kind
    });
  }

  async function createMediaRoom(room: { name: string; allowsVideo: boolean; categoryId?: string; position?: number; roleAccess?: RoomRoleAccess }) {
    const roomId = resourceId("media-room");
    const parentScopeType = "category";
    const parentScopeId = room.categoryId || "voice-rooms";
    const position = room.position ?? (input.live.state.voiceRoomPlacements || []).filter((item) => item.categoryId === parentScopeId).length;
    await dispatch("scopeParentSet", { scopeType: "media-room", scopeId: roomId, parentScopeType, parentScopeId });
    try {
      await dispatch("mediaRoomCreateScoped", { roomId, name: room.name, allowsVideo: room.allowsVideo, kind: "voice", parentScopeType, parentScopeId });
      await dispatch("voiceRoomPlacementCreate", { roomId, categoryId: parentScopeId, position });
    } catch (error) {
      await dispatch("mediaRoomArchive", { roomId: roomId as RoomId }).catch(() => undefined);
      await dispatch("scopeParentRemove", { scopeType: "media-room", scopeId: roomId }).catch(() => undefined);
      throw error;
    }
  }

  async function reorderMediaRoom(roomId: string, categoryId: string, position: number) {
    const placement = (input.live.state.voiceRoomPlacements || []).find((item) => item.roomId === roomId);
    const currentCategoryId = placement?.categoryId;
    const changesParent = categoryId !== currentCategoryId;
    if (changesParent) {
      await dispatch("scopeParentSet", { scopeType: "media-room", scopeId: roomId, parentScopeType: "category", parentScopeId: categoryId });
    }
    try {
      await dispatch("voiceRoomPlacementUpdate", { roomId, categoryId, position });
    } catch (error) {
      if (changesParent && currentCategoryId) {
        await dispatch("scopeParentSet", { scopeType: "media-room", scopeId: roomId, parentScopeType: "category", parentScopeId: currentCategoryId }).catch(() => undefined);
      }
      throw error;
    }
  }

  async function updateMediaRoomSettings(roomId: string, settings: { name?: string; group?: string | null; allowsVideo?: boolean; locked?: boolean; roleAccess?: RoomRoleAccess }) {
    await dispatch("mediaRoomUpdate", { roomId: roomId as RoomId, ...settings });
  }

  async function archiveMediaRoom(roomId: string) {
    await dispatch("mediaRoomArchive", { roomId: roomId as RoomId });
  }

  async function createRole(role: { roleId: string; name: string; description?: string; color?: string; rules?: unknown[] }) {
    requireRoleAdministrator();
    await dispatch("roleCreate", { ...role, roleId: role.roleId as RoleId, rules: roleRulesWithoutManagementOperations(role.rules) });
  }

  async function updateRole(roleId: string, role: { name?: string; description?: string; color?: string; rules?: unknown[] }) {
    requireRoleAdministrator();
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
      rules: roleRulesWithoutManagementOperations(role.rules ?? scoped.rules ?? DEFAULT_ROLE_RULES)
    });
  }

  async function archiveRole(roleId: string) {
    requireRoleAdministrator();
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
    requireRoleAdministrator();
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

  async function createInvite(invite: InviteInput) {
    requireRoleAdministrator();
    if (!invite.roleId.trim()) throw new Error("Invite role is required.");
    return input.live.management.invites.create({
      name: invite.name?.trim() || undefined,
      roleId: invite.roleId,
      maxUses: invite.maxUses ?? undefined,
      expiresAt: invite.expiresAt ?? null
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
    archiveCategory,
    archiveMediaRoom,
    archiveRole,
    archiveTextChannel,
    approveJoinRequest,
    banMember,
    assignMemberRoles,
    createCategory,
    createMediaRoom,
    createVoiceTextChannel,
    createInvite,
    createRole,
    createTextChannel,
    denyJoinRequest,
    disableInvite,
    moderateMember,
    openManageDialog,
    reorderCategory,
    reorderMediaRoom,
    reorderTextChannel,
    setChannelPinned,
    removeInvite,
    unbanMember,
    updateCategory,
    updateMediaRoomSettings,
    updateRole,
    updateTextChannel
  };
}
