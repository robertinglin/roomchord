import React, { useState } from "react";
import { roomkitDisplayName } from "roomkit-sdk/browser/displayName";
import type { RoomKitEphemeralToken } from "roomkit-sdk/browser/liveRoomConnector";
import type { Actor, ChatEmbed, CommentThread, MediaRoom, MemberRoleAssignment, Presence, RoleDefinition, RoomMember, ScreenShare } from "@entities/chat/model/types";
import { assignedRoleIds, roleNames } from "@entities/chat/model/roles";
import { Avatar } from "@shared/ui/Avatar";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";

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

function memberName(member: RoomMember, id: string) {
  return roomkitDisplayName({ member, fallbackId: id });
}

function avatarFor(member?: RoomMember, presence?: Presence, actor?: Actor) {
  return presence?.profileImageUrl || presence?.avatarUrl || presence?.avatar || member?.profileImageUrl || member?.avatarUrl || member?.avatar || actor?.profileImageUrl || actor?.avatarUrl || actor?.avatar;
}

function memberRows(roomMembers: Record<string, RoomMember> | undefined, presence: Record<string, Presence> | undefined, actor?: Actor, roleDefinitions?: Record<string, RoleDefinition>, memberRoles?: Record<string, MemberRoleAssignment>): MemberRow[] {
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
      name: roomkitDisplayName({ presence: item, fallback: current?.name, fallbackId: memberId }),
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
      name: roomkitDisplayName({ actor, fallbackId: actor.memberId }),
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
  voiceTokens: RoomKitEphemeralToken[];
  roleDefinitions?: Record<string, RoleDefinition>;
  memberRoles?: Record<string, MemberRoleAssignment>;
  canManageRoles: boolean;
  onDirectMessage: (memberId: string) => void;
  onSetMemberRoles: (memberId: string) => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const members = memberRows(roomMembers, presence, actor, roleDefinitions, memberRoles);
  const activeRooms = rooms
    .filter((room) => !room.archivedAt && voiceTokens.some((token) => token.scope === room.id))
    .map((room) => ({ room, count: voiceTokens.filter((token) => token.scope === room.id).length }));

  function isActiveMember(member: MemberRow) {
    return member.status !== "offline";
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
            className={`member-row member-action${selectedMemberId === member.id ? " selected" : ""}`}
            type="button"
            disabled={!member.canMessage && !canManageRoles}
            aria-label={member.self ? `${member.name} (you)` : `${member.name}, ${member.status}`}
            onClick={() => setSelectedMemberId((current) => current === member.id ? undefined : member.id)}
          >
            <span className={`status-dot ${member.status}`} />
            <Avatar name={member.name} avatar={member.avatar} small />
            <span>
              <strong>{member.self ? `${member.name} (you)` : member.name}</strong>
              <small>{member.activity || member.role || member.status}</small>
            </span>
          </button>
        </MemberContextMenu>
        {selectedMemberId === member.id && member.canMessage ? (
          <div className="member-context">
            <span>{member.role || member.status}</span>
            <button type="button" className="secondary-action" onClick={() => onDirectMessage(member.id)}>
              Send DM
            </button>
          </div>
        ) : null}
      </React.Fragment>
    );
  }

  const activeMembers = members.filter(isActiveMember);
  const offlineMembers = members.filter((member) => !isActiveMember(member));

  return (
    <aside className="member-rail" aria-label="Room details">
      <section className="rail-section">
        <h2>Online - {activeMembers.length}</h2>
        <div className="member-list">
          {activeMembers.length === 0 ? <p className="rail-empty">No one online</p> : activeMembers.map(renderMember)}
        </div>
      </section>

      {offlineMembers.length > 0 ? (
        <section className="rail-section">
          <h2>Offline - {offlineMembers.length}</h2>
          <div className="member-list">
            {offlineMembers.map(renderMember)}
          </div>
        </section>
      ) : null}

      <section className="rail-section">
        <h2>Live now</h2>
        <div className="rail-list">
          {activeRooms.length === 0 && screenShares.length === 0 ? <p className="rail-empty">Nothing live</p> : null}
          {activeRooms.map(({ room, count }) => (
            <div className="rail-item" key={room.id}>
              <strong>{room.name}</strong>
              <span>{count} joined</span>
            </div>
          ))}
          {screenShares.map((share) => (
            <div className="rail-item" key={share.id}>
              <strong>{share.title || "Screen share"}</strong>
              <span>{share.presenterName || share.ownerName || share.presenterId || share.ownerId || "Presenter"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h2>Threads</h2>
        <div className="rail-list">
          {threads.length === 0 ? <p className="rail-empty">No threads</p> : null}
          {threads.slice(0, 5).map((thread) => (
            <div className="rail-item" key={thread.id}>
              <strong>{thread.title || "Thread"}</strong>
              <span>{thread.resolved ? "Resolved" : "Open"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h2>Links</h2>
        <div className="rail-list">
          {embeds.length === 0 ? <p className="rail-empty">No links</p> : null}
          {embeds.slice(0, 5).map((embed) => (
            <a className="rail-item link-item" href={embed.url} target="_blank" rel="noreferrer" key={embed.id}>
              <strong>{embed.title || embed.provider || "Link"}</strong>
              {embed.url ? <span>{embed.url}</span> : null}
            </a>
          ))}
        </div>
      </section>

    </aside>
  );
}
