import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import type { MatterhornEphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import type { Actor, ChatEmbed, ChatState, CommentThread, MediaRoom, MemberRoleAssignment, Presence, RoleDefinition, RoomMember, ScreenShare } from "@entities/chat/model/types";
import { assignedRoleIds, roleNames } from "@entities/chat/model/roles";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";
import { Button, RailGroup, RailMember } from "@shared/ui/design";
import type { PresenceStatus } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

type MemberRow = {
  id: string;
  name: string;
  status: string;
  activity?: string | null;
  avatar?: string;
  role?: string;
  roleIds: string[];
  self: boolean;
  canMessage: boolean;
};

const styles = stylex.create({
  rail: {
    minWidth: 0,
    overflowY: "auto",
    padding: "16px 8px 24px",
    borderLeft: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: tokens.surface,
  },
  memberButton: {
    width: "100%",
    display: "block",
    overflow: "visible",
    padding: 0,
    border: 0,
    borderRadius: tokens.radiusItem,
    backgroundColor: "transparent",
    color: tokens.fg,
    textAlign: "left",
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.panelHover },
    ":focus": { outline: "none", backgroundColor: tokens.panelHover },
    ":disabled": { cursor: "default" },
  },
  selected: { backgroundColor: tokens.panelHover },
  context: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "8px",
    margin: "2px 8px 8px 50px",
    color: tokens.quiet,
    fontSize: "12px",
  },
  liveItem: {
    display: "grid",
    gap: "2px",
    padding: "5px 8px",
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
  },
  liveTitle: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  liveSub: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.quiet,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
  },
  empty: {
    margin: 0,
    padding: "5px 8px",
    color: tokens.quiet,
    fontSize: "12px",
  },
});

function memberName(member: RoomMember, id: string) {
  return matterhornDisplayName({ member, fallbackId: id });
}

function avatarFor(member?: RoomMember, presence?: Presence, actor?: Actor) {
  return presence?.profileImageUrl || presence?.avatarUrl || presence?.avatar || member?.profileImageUrl || member?.avatarUrl || member?.avatar || actor?.profileImageUrl || actor?.avatarUrl || actor?.avatar;
}

function memberRows(roomMembers: Record<string, RoomMember> | undefined, presence: Record<string, Presence> | undefined, actor?: Actor, roleDefinitions?: Record<string, RoleDefinition>, memberRoles?: Partial<ChatState> | Record<string, MemberRoleAssignment>): MemberRow[] {
  const rows = new Map<string, MemberRow>();
  const safeRoomMembers = roomMembers || {};
  const safePresence = presence || {};
  for (const [key, member] of Object.entries(safeRoomMembers)) {
    const id = member.memberId || member.id || key;
    if (!id || member.revokedAt || member.bannedAt) continue;
    rows.set(id, {
      id,
      name: memberName(member, id),
      status: member.status || "offline",
      activity: member.role || member.status || "offline",
      avatar: avatarFor(member, undefined, actor?.memberId === id ? actor : undefined),
      role: member.role,
      roleIds: assignedRoleIds(id, member.role, memberRoles),
      self: actor?.memberId === id,
      canMessage: Boolean(actor?.memberId && actor.memberId !== id)
    });
  }
  for (const [id, item] of Object.entries(safePresence)) {
    const memberId = item.memberId || id;
    const current = rows.get(memberId);
    rows.set(memberId, {
      id: memberId,
      name: matterhornDisplayName({ presence: item, fallback: current?.name, fallbackId: memberId }),
      status: item.visible === false ? "offline" : item.status || current?.status || "online",
      activity: item.activity ?? current?.activity,
      avatar: avatarFor(safeRoomMembers[memberId], item, actor?.memberId === memberId ? actor : undefined) || current?.avatar,
      role: current?.role,
      roleIds: assignedRoleIds(memberId, current?.role, memberRoles),
      self: actor?.memberId === memberId,
      canMessage: Boolean(actor?.memberId && actor.memberId !== memberId)
    });
  }
  if (actor && !rows.has(actor.memberId)) {
    rows.set(actor.memberId, {
      id: actor.memberId,
      name: matterhornDisplayName({ actor, fallbackId: actor.memberId }),
      status: "online",
      activity: actor.role,
      avatar: avatarFor(undefined, undefined, actor),
      role: actor.role,
      roleIds: assignedRoleIds(actor.memberId, actor.role, memberRoles),
      self: true,
      canMessage: false
    });
  }
  return [...rows.values()].map((row) => {
    const assignedRoles = roleNames(row.roleIds, roleDefinitions);
    const activity = row.activity && row.activity !== row.role ? row.activity : assignedRoles.join(", ") || row.activity;
    return { ...row, role: assignedRoles.join(", ") || row.role, activity };
  }).sort((left, right) => Number(right.self) - Number(left.self) || left.name.localeCompare(right.name));
}

export function PresencePanel({
  actor,
  roomMembers,
  presence,
  embeds,
  threads,
  rooms,
  screenShares,
  voiceTokens,
  roleDefinitions,
  memberRoles,
  canManageRoles,
  onDirectMessage,
  onSetMemberRoles
}: {
  actor?: Actor;
  roomMembers?: Record<string, RoomMember>;
  presence?: Record<string, Presence>;
  embeds: ChatEmbed[];
  threads: CommentThread[];
  rooms: MediaRoom[];
  screenShares: ScreenShare[];
  voiceTokens: MatterhornEphemeralToken[];
  roleDefinitions?: Record<string, RoleDefinition>;
  memberRoles?: Partial<ChatState> | Record<string, MemberRoleAssignment>;
  canManageRoles: boolean;
  onDirectMessage: (memberId: string) => void;
  onSetMemberRoles: (memberId: string) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const members = memberRows(roomMembers, presence, actor, roleDefinitions, memberRoles);
  const activeRooms = rooms
    .filter((room) => !room.archivedAt && voiceTokens.some((token) => token.scope === room.id))
    .map((room) => ({ room, count: voiceTokens.filter((token) => token.scope === room.id).length }));
  void embeds;
  void threads;

  function isActiveMember(member: MemberRow) {
    return member.status !== "offline";
  }

  function statusClass(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === "offline") return "off";
    if (normalized === "away" || normalized === "idle") return "idle";
    if (normalized === "busy" || normalized === "dnd" || normalized === "focus") return "dnd";
    return "on";
  }

  function presenceStatus(status: string): PresenceStatus {
    const normalized = statusClass(status);
    if (normalized === "idle") return "idle";
    if (normalized === "dnd") return "dnd";
    if (normalized === "off") return "off";
    return "on";
  }

  function memberActions(member: MemberRow): MemberContextMenuAction[] {
    if (!canManageRoles) return [];
    return [{
      id: "set-roles",
      label: "Set roles",
      onSelect: () => onSetMemberRoles(member.id)
    }];
  }

  function renderMember(member: MemberRow) {
    return (
      <React.Fragment key={member.id}>
        <MemberContextMenu
          additionalActions={memberActions(member)}
          currentUserId={actor?.memberId}
          memberId={member.id}
          memberName={member.name}
          onDirectMessage={onDirectMessage}
        >
          <button
            {...stylex.props(styles.memberButton, selectedMemberId === member.id && styles.selected)}
            type="button"
            disabled={!member.canMessage && !canManageRoles}
            aria-label={member.self ? `${member.name} (you)` : `${member.name}, ${member.status}`}
            onClick={() => setSelectedMemberId((current) => current === member.id ? undefined : member.id)}
          >
            <RailMember
              avatar={member.avatar || ""}
              name={member.self ? `${member.name} (you)` : member.name}
              status={presenceStatus(member.status)}
              sub={member.role || member.status}
            />
          </button>
        </MemberContextMenu>
      </React.Fragment>
    );
  }

  const activeMembers = members.filter(isActiveMember);
  const offlineMembers = members.filter((member) => !isActiveMember(member));

  return (
    <aside {...stylex.props(styles.rail)} aria-label="Room details">
      <RailGroup label="Online" count={activeMembers.length}>
        <div>
          {activeMembers.length === 0 ? <p {...stylex.props(styles.empty)}>No one online</p> : activeMembers.map(renderMember)}
        </div>
      </RailGroup>

      {offlineMembers.length > 0 ? (
        <RailGroup label="Offline" count={offlineMembers.length}>
          <div>
            {offlineMembers.map(renderMember)}
          </div>
        </RailGroup>
      ) : null}

      <RailGroup label="Live now" count={activeRooms.length + screenShares.length}>
        <div>
          {activeRooms.length === 0 && screenShares.length === 0 ? <p {...stylex.props(styles.empty)}>Nothing live</p> : null}
          {activeRooms.map(({ room, count }) => (
            <div {...stylex.props(styles.liveItem)} key={room.id}>
              <strong {...stylex.props(styles.liveTitle)}>{room.name}</strong>
              <span {...stylex.props(styles.liveSub)}>{count} joined</span>
            </div>
          ))}
          {screenShares.map((share) => (
            <div {...stylex.props(styles.liveItem)} key={share.id}>
              <strong {...stylex.props(styles.liveTitle)}>{share.title || "Screen share"}</strong>
              <span {...stylex.props(styles.liveSub)}>{share.presenterName || share.ownerName || share.presenterId || share.ownerId || "Presenter"}</span>
            </div>
          ))}
        </div>
      </RailGroup>

    </aside>
  );
}
