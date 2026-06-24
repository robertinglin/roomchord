import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import {
  DEFAULT_ROOM_ROLES as MATTERHORN_DEFAULT_ROLES,
  ROOM_ACCESS_RANKS,
  activeRoleDefinitions as matterhornActiveRoleDefinitions,
  roleIdsForActor,
  roomAccessLevelForActor as matterhornRoomAccessLevelForActor
} from "matterhorn-sdk/browser";
import type { MatterhornPermissionActor } from "matterhorn-sdk/browser";
import type { Actor, ChatState, MediaRoom, MemberRoleAssignment, Presence, RoleDefinition, RoleId, RoomMember, RoomRoleAccessLevel } from "@entities/chat/model/types";

export const DEFAULT_ROLES: Record<string, RoleDefinition> = MATTERHORN_DEFAULT_ROLES as Record<string, RoleDefinition>;

export type MemberOption = {
  id: string;
  name: string;
  baseRole?: string;
  roleIds: string[];
};

export function cleanRoleId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "custom-role";
}

function roleState(input?: Record<string, RoleDefinition> | Partial<ChatState>) {
  if (!input) return { roleDefinitions: DEFAULT_ROLES };
  if ("roleDefinitions" in input || "access" in input || "scopedRoles" in input) return input;
  return { roleDefinitions: input };
}

export function activeRoles(roleDefinitions?: Record<string, RoleDefinition> | Partial<ChatState>) {
  return Object.values(matterhornActiveRoleDefinitions(roleState(roleDefinitions)) as Record<string, RoleDefinition>)
    .filter((role) => !role.archivedAt)
    .sort((left, right) => (Number(right.rank) || 0) - (Number(left.rank) || 0) || String(left.name || left.id).localeCompare(String(right.name || right.id)));
}

export function roleLabel(roleId: string | undefined, roleDefinitions?: Record<string, RoleDefinition> | Partial<ChatState>) {
  if (!roleId) return undefined;
  const definitions = matterhornActiveRoleDefinitions(roleState(roleDefinitions)) as Record<string, RoleDefinition>;
  return definitions[roleId]?.name || DEFAULT_ROLES[roleId]?.name || roleId;
}

function memberIdFromEntry(key: string, member?: (RoomMember | Presence) & { id?: string }) {
  return member?.memberId || member?.id || key;
}

function stateFromAssignmentInput(input?: Partial<ChatState> | Record<string, MemberRoleAssignment>) {
  if (!input) return undefined;
  if ("roleDefinitions" in input || "access" in input || "scopedRoles" in input || "memberRoles" in input) return input;
  return { memberRoles: input };
}

export function assignedRoleIds(memberId: string, baseRole?: string, stateOrMemberRoles?: Partial<ChatState> | Record<string, MemberRoleAssignment>) {
  return roleIdsForActor({ memberId, role: baseRole }, stateFromAssignmentInput(stateOrMemberRoles));
}

export function memberOptions(actor: Actor, roomMembers: Record<string, RoomMember>, presence: Record<string, Presence>, stateOrMemberRoles?: Partial<ChatState> | Record<string, MemberRoleAssignment>): MemberOption[] {
  const members = new Map<string, Omit<MemberOption, "roleIds">>();
  for (const [key, member] of Object.entries(roomMembers || {})) {
    if (member.revokedAt || member.bannedAt) continue;
    const id = memberIdFromEntry(key, member);
    if (!id) continue;
    members.set(id, { id, name: matterhornDisplayName({ member, fallbackId: id }), baseRole: member.role });
  }
  for (const [key, item] of Object.entries(presence || {})) {
    const id = memberIdFromEntry(key, item);
    if (!id) continue;
    const current = members.get(id);
    members.set(id, {
      id,
      name: matterhornDisplayName({ presence: item, fallback: current?.name, fallbackId: id }),
      baseRole: current?.baseRole
    });
  }
  members.set(actor.memberId, {
    id: actor.memberId,
    name: matterhornDisplayName({ actor, fallback: members.get(actor.memberId)?.name, fallbackId: actor.memberId }),
    baseRole: actor.role
  });
  return [...members.values()]
    .map((member) => ({ ...member, roleIds: assignedRoleIds(member.id, member.baseRole, stateOrMemberRoles) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function roleNames(roleIds: string[], roleDefinitions?: Record<string, RoleDefinition> | Partial<ChatState>) {
  return roleIds.map((roleId) => roleLabel(roleId, roleDefinitions) || roleId);
}

function normalizedRoomAccess(room: MediaRoom) {
  const access = room.roleAccess || {};
  return Object.fromEntries(Object.entries(access).filter(([, level]) => level === "readonly" || level === "editor"));
}

export function roomAccessLevelForRoles(room: MediaRoom, roleIds: string[], canManageRooms: boolean): RoomRoleAccessLevel {
  if (canManageRooms) return "editor";
  const access = normalizedRoomAccess(room);
  if (Object.keys(access).length === 0) return "editor";
  let selected: RoomRoleAccessLevel = "hidden";
  for (const roleId of roleIds) {
    const level = access[roleId];
    if (!level) continue;
    if (ROOM_ACCESS_RANKS[level] > ROOM_ACCESS_RANKS[selected]) selected = level;
  }
  return selected;
}

export function actorRoomAccessLevel(room: MediaRoom, actor: Actor, state: Partial<ChatState>, canManageRooms: boolean): RoomRoleAccessLevel {
  if (canManageRooms) return "editor";
  const permissionActor: MatterhornPermissionActor = { ...actor };
  return matterhornRoomAccessLevelForActor(room, permissionActor, state) as RoomRoleAccessLevel;
}

export function canViewRoom(room: MediaRoom, roleIds: string[], canManageRooms: boolean) {
  return roomAccessLevelForRoles(room, roleIds, canManageRooms) !== "hidden";
}

export function canEditRoom(room: MediaRoom, roleIds: string[], canManageRooms: boolean) {
  return roomAccessLevelForRoles(room, roleIds, canManageRooms) === "editor";
}

export function roomAccessSummary(room: MediaRoom, roles: RoleDefinition[]) {
  const access = normalizedRoomAccess(room);
  const entries = Object.entries(access);
  if (entries.length === 0) return "Open to all roles";
  const editorCount = entries.filter(([, level]) => level === "editor").length;
  const readonlyCount = entries.filter(([, level]) => level === "readonly").length;
  const labels = [];
  if (editorCount) labels.push(`${editorCount} can join`);
  if (readonlyCount) labels.push(`${readonlyCount} read only`);
  const knownNames = entries.slice(0, 2).map(([roleId]) => roles.find((role) => role.id === roleId)?.name || roleId);
  return `${labels.join(", ")}: ${knownNames.join(", ")}${entries.length > 2 ? ` +${entries.length - 2}` : ""}`;
}
