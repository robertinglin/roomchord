import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import type { Actor, MediaRoom, MemberRoleAssignment, Presence, RoleDefinition, RoleId, RoomMember, RoomRoleAccessLevel } from "@entities/chat/model/types";

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  guest: { id: "guest" as RoleId, name: "Guest", description: "Read-only access", color: "#6b7280", rank: 0, systemRole: true, archivedAt: null },
  member: { id: "member" as RoleId, name: "Member", description: "Messages and voice joins", color: "#22c55e", rank: 1, systemRole: true, archivedAt: null },
  moderator: { id: "moderator" as RoleId, name: "Moderator", description: "Channel, message, and voice settings", color: "#38bdf8", rank: 2, systemRole: true, archivedAt: null },
  admin: { id: "admin" as RoleId, name: "Admin", description: "Channel creation and role management", color: "#a78bfa", rank: 3, systemRole: true, archivedAt: null },
  owner: { id: "owner" as RoleId, name: "Owner", description: "Full room ownership", color: "#f59e0b", rank: 4, systemRole: true, archivedAt: null }
};

export type MemberOption = {
  id: string;
  name: string;
  baseRole?: string;
  roleIds: string[];
};

const ROLE_ACCESS_RANKS: Record<RoomRoleAccessLevel, number> = {
  hidden: 0,
  readonly: 1,
  editor: 2
};

export function cleanRoleId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "custom-role";
}

export function activeRoles(roleDefinitions?: Record<string, RoleDefinition>) {
  const merged = { ...DEFAULT_ROLES, ...(roleDefinitions || {}) };
  return Object.values(merged)
    .filter((role) => !role.archivedAt)
    .sort((left, right) => (right.rank || 0) - (left.rank || 0) || left.name.localeCompare(right.name));
}

export function roleLabel(roleId: string | undefined, roleDefinitions?: Record<string, RoleDefinition>) {
  if (!roleId) return undefined;
  return roleDefinitions?.[roleId]?.name || DEFAULT_ROLES[roleId]?.name || roleId;
}

function memberIdFromEntry(key: string, member?: (RoomMember | Presence) & { id?: string }) {
  return member?.memberId || member?.id || key;
}

function uniqueRoleIds(roleIds: Array<string | null | undefined>) {
  return [...new Set(roleIds.map((roleId) => roleId?.trim()).filter((roleId): roleId is string => Boolean(roleId)))];
}

export function assignedRoleIds(memberId: string, baseRole?: string, memberRoles?: Record<string, MemberRoleAssignment>) {
  const assignment = memberRoles?.[memberId];
  return uniqueRoleIds([baseRole, assignment?.roleId, ...(assignment?.roleIds || [])]);
}

export function memberOptions(actor: Actor, roomMembers: Record<string, RoomMember>, presence: Record<string, Presence>, memberRoles?: Record<string, MemberRoleAssignment>): MemberOption[] {
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
    .map((member) => ({ ...member, roleIds: assignedRoleIds(member.id, member.baseRole, memberRoles) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function roleNames(roleIds: string[], roleDefinitions?: Record<string, RoleDefinition>) {
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
    if (ROLE_ACCESS_RANKS[level] > ROLE_ACCESS_RANKS[selected]) selected = level;
  }
  return selected;
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
