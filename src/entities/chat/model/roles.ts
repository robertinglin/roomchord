import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import {
  ROOM_ACCESS_RANKS,
  roleIdsForActor,
  roomAccessLevelForActor as matterhornRoomAccessLevelForActor
} from "matterhorn-sdk/browser";
import type { MatterhornPermissionActor } from "matterhorn-sdk/browser";
import type { MatterhornRoleRule } from "matterhorn-sdk/browser";
import type { MemberPreference } from "@entities/chat/model/localMemberPreferences";
import type { Actor, ChatState, MediaRoom, Presence, RoleDefinition, RoleId, RoomMember, RoomRoleAccessLevel } from "@entities/chat/model/types";

const DEFAULT_ROLE_LABELS: Record<string, string> = {
  guest: "Guest",
  member: "Member",
  moderator: "Moderator",
  admin: "Admin",
  owner: "Owner"
};

export type MemberOption = {
  id: string;
  name: string;
  kind?: "bot";
  baseRole?: string;
  roleIds: string[];
  avatar?: string;
  status?: string;
};

/** Design-system presence status mapped from raw presence strings. */
export type MemberPresence = "on" | "idle" | "dnd" | "off";

export function presenceStatus(raw?: string): MemberPresence {
  if (raw === "online") return "on";
  if (raw === "idle") return "idle";
  if (raw === "dnd") return "dnd";
  return "off";
}

/** Avatar URL from any member/presence/actor source (mirrors PresencePanel.avatarFor). */
function avatarFor(member?: RoomMember, presence?: Presence, actor?: Actor) {
  return presence?.profileImageUrl || presence?.avatarUrl || presence?.avatar || member?.profileImageUrl || member?.avatarUrl || member?.avatar || actor?.profileImageUrl || actor?.avatarUrl || actor?.avatar;
}

const ROLE_COLOR_IDS = new Set(["owner", "admin", "moderator", "mod", "member", "guest"]);

/** Resolve a role chip's {label,color} from role definitions, falling back to tokens. */
export function roleChipFor(roleId: string | undefined, input?: RoleDefinitionsInput): { label: string; color?: string } | undefined {
  if (!roleId) return undefined;
  const label = roleLabel(roleId, input) || roleId;
  const defs = roleDefinitions(input);
  const definition = Object.values(defs).find((role) => role.id === roleId);
  const color = definition?.color;
  return { label, color };
}

/** Primary role id for chip rendering: first assigned role id with a definition, else the base role. */
export function primaryRoleFor(roleIds: string[], baseRole?: string, input?: RoleDefinitionsInput): string | undefined {
  const defs = roleDefinitions(input);
  const knownIds = new Set(Object.keys(defs));
  for (const id of roleIds) {
    if (knownIds.has(id)) return id;
  }
  return baseRole && ROLE_COLOR_IDS.has(baseRole) ? baseRole : roleIds[0] || baseRole;
}

export function cleanRoleId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "custom-role";
}

type RoleDefinitionsInput = ChatState["roleDefinitions"] | Partial<Pick<ChatState, "roleDefinitions">>;

function roleDefinitions(input?: RoleDefinitionsInput): Record<string, RoleDefinition> {
  if (!input) return {};
  const state = "roleDefinitions" in input ? input : undefined;
  const definitions = (state?.roleDefinitions || (input as ChatState["roleDefinitions"])) as Record<string, RoleDefinition>;
  const scopedRoles = (input as ChatState & {
    scopedRoles?: { roles?: Record<string, { roleId?: string; name?: string; description?: string; color?: string; generation?: number; revision?: number; definitionHash?: string; rules?: unknown[] }> };
  }).scopedRoles?.roles || {};
  return {
    ...definitions,
    ...Object.fromEntries(Object.entries(scopedRoles).map(([id, role]) => [id, {
      id: role.roleId || id,
      name: role.name || role.roleId || id,
      description: role.description || "",
      color: role.color || "",
      rank: 0,
      systemRole: false,
      archivedAt: null,
      ...role,
    }] as [string, RoleDefinition])),
  };
}

export function activeRoles(input?: RoleDefinitionsInput) {
  return Object.values(roleDefinitions(input))
    .filter((role) => !role.archivedAt)
    .sort((left, right) => (Number(right.rank) || 0) - (Number(left.rank) || 0) || String(left.name || left.id).localeCompare(String(right.name || right.id)));
}

export function roleLabel(roleId: string | undefined, input?: RoleDefinitionsInput) {
  if (!roleId) return undefined;
  const role = Object.values(roleDefinitions(input)).find((definition) => definition.id === roleId);
  return role?.name || DEFAULT_ROLE_LABELS[roleId] || roleId;
}

function memberIdFromEntry(key: string, member?: (RoomMember | Presence) & { id?: string }) {
  return member?.memberId || member?.id || key;
}

function roomMemberDisplayName(member: RoomMember, id: string) {
  const serviceName = member.kind === "bot" ? String(member.serviceDisplayName || "").trim() : "";
  return serviceName || matterhornDisplayName({ member, fallbackId: id });
}

export function assignedRoleIds(memberId: string, baseRole?: string, state?: Partial<ChatState>) {
  return roleIdsForActor({ memberId, role: baseRole }, state);
}

export function memberOptions(actor: Actor, roomMembers: Record<string, RoomMember>, presence: Record<string, Presence>, state?: Partial<ChatState>, memberPreferences: Record<string, MemberPreference> = {}): MemberOption[] {
  const members = new Map<string, Omit<MemberOption, "roleIds">>();
  for (const [key, member] of Object.entries(roomMembers || {})) {
    if (member.revokedAt || member.bannedAt) continue;
    const id = memberIdFromEntry(key, member);
    if (!id) continue;
    members.set(id, { id, name: roomMemberDisplayName(member, id), kind: member.kind === "bot" ? "bot" : undefined, baseRole: member.role, avatar: avatarFor(member), status: member.status });
  }
  for (const [key, item] of Object.entries(presence || {})) {
    const id = memberIdFromEntry(key, item);
    if (!id) continue;
    const current = members.get(id);
    const visible = item.visible === false ? false : true;
    members.set(id, {
      id,
      name: current?.kind === "bot" ? current.name : matterhornDisplayName({ presence: item, fallback: current?.name, fallbackId: id }),
      kind: current?.kind,
      baseRole: current?.baseRole,
      avatar: avatarFor(roomMembers?.[id], item, actor.memberId === id ? actor : undefined) || current?.avatar,
      status: visible ? (item.status || current?.status || "online") : current?.status || "offline"
    });
  }
  members.set(actor.memberId, {
    id: actor.memberId,
    name: matterhornDisplayName({ actor, fallback: members.get(actor.memberId)?.name, fallbackId: actor.memberId }),
    kind: members.get(actor.memberId)?.kind,
    baseRole: actor.role,
    avatar: avatarFor(roomMembers?.[actor.memberId], presence?.[actor.memberId], actor) || members.get(actor.memberId)?.avatar,
    status: "online"
  });
  return [...members.values()]
    .map((member) => ({ ...member, name: memberPreferences[member.id]?.nickname || member.name, roleIds: assignedRoleIds(member.id, member.baseRole, state) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function roleNames(roleIds: string[], roleDefinitions?: RoleDefinitionsInput) {
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

export type ScopedRoomAccessDecision = RoomRoleAccessLevel | "inherit";

function scopedRuleSpecificity(rule: MatterhornRoleRule, scopeType: string, scopeId: string) {
  if (rule.scopeType === scopeType && rule.scopeId === scopeId) return 3;
  if (rule.scopeType === scopeType && rule.scopeId === "*") return 2;
  if (rule.scopeType === "*" && rule.scopeId === "*") return 1;
  return 0;
}

export function scopedRoomAccessDecision(
  rules: readonly MatterhornRoleRule[] | undefined,
  scope: { scopeType: string; scopeId: string },
  operationTypes: readonly string[] = ["media.room.join", "matterhorn.scope.view"]
): ScopedRoomAccessDecision {
  const matching = (rules || [])
    .map((rule) => ({ rule, specificity: scopedRuleSpecificity(rule, scope.scopeType, scope.scopeId) }))
    .filter((item) => item.specificity > 0);
  if (!matching.length) return "inherit";
  const specificity = Math.max(...matching.map((item) => item.specificity));
  const selected = matching.filter((item) => item.specificity === specificity).map((item) => item.rule);
  if (selected.some((rule) => rule.denyOperations.some((operation) => operationTypes.includes(operation)))) return "hidden";
  if (selected.some((rule) => rule.allowOperations.some((operation) => operationTypes.includes(operation)))) return "editor";
  return "inherit";
}

export function scopedRoomAccessSummary(
  room: MediaRoom,
  roles: RoleDefinition[],
  rulesByRole: Record<string, readonly MatterhornRoleRule[]> | undefined
) {
  if (!rulesByRole) return roomAccessSummary(room, roles);
  const scope = { scopeType: room.scopeType || "media-room", scopeId: room.scopeId || room.id };
  const decisions = roles.map((role) => ({ role, decision: scopedRoomAccessDecision(rulesByRole[role.id], scope) }));
  const explicit = decisions.filter((item) => item.decision !== "inherit");
  if (!explicit.length) return `Scoped rules inherit legacy access · ${roomAccessSummary(room, roles)}`;
  const editorNames = explicit.filter((item) => item.decision === "editor").map((item) => item.role.name);
  const hiddenNames = explicit.filter((item) => item.decision === "hidden").map((item) => item.role.name);
  const parts = [];
  if (editorNames.length) parts.push(`${editorNames.length} can join`);
  if (hiddenNames.length) parts.push(`${hiddenNames.length} hidden`);
  const inherited = decisions.length - explicit.length;
  if (inherited) parts.push(`${inherited} inherit`);
  return `Scoped access: ${parts.join(", ")}`;
}
