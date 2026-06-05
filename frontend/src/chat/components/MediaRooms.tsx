import React, { useState } from "react";
import type { CallMediaSettings } from "roomkit-sdk/browser/types";
import type { RoomKitEphemeralToken } from "roomkit-sdk/browser/liveRoomConnector";
import { groupedChannelItems, optionalChannelGroup } from "../channelGroups";
import type { ChatState, MediaRoom } from "../types";
import { canEditRoom, canViewRoom } from "../roles";
import { Avatar } from "./Avatar";
import { ChevronRightIcon, PlusIcon, SpeakerIcon } from "./Icons";
import { MemberContextMenu, type MemberContextMenuAction } from "./MemberContextMenu";

export type MediaRoomsProps = {
  state: ChatState;
  activeRoomId?: string;
  selectedRoomId?: string;
  voiceTokens: RoomKitEphemeralToken[];
  canManageRooms: boolean;
  currentUserId?: string;
  currentRoleIds: string[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onCreate?: (input: { name: string; group?: string }) => void | Promise<void>;
  onDirectMessage?: (memberId: string) => void;
  onJoin: (room: MediaRoom, media: CallMediaSettings) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
};

function tokenAvatar(token: RoomKitEphemeralToken) {
  return typeof token.payload?.avatar === "string" ? token.payload.avatar : undefined;
}

function connectedVoiceMembers(tokens: RoomKitEphemeralToken[], roomId: string) {
  const members: Array<{ avatar?: string; key: string; memberId?: string; name: string; participantId: string }> = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.scope !== roomId) continue;
    const participantId = token.clientId || token.ownerId || token.id;
    if (seen.has(participantId)) continue;
    seen.add(participantId);
    members.push({
      avatar: tokenAvatar(token),
      key: participantId,
      memberId: token.ownerId,
      name: token.ownerName || token.ownerId || token.clientId || "Connected user",
      participantId
    });
  }
  return members;
}

export function MediaRooms({
  state,
  activeRoomId,
  selectedRoomId,
  voiceTokens,
  canManageRooms,
  currentUserId,
  currentRoleIds,
  mutedVoiceParticipantIds = {},
  onCreate,
  onDirectMessage,
  onJoin,
  onToggleVoiceParticipantMute
}: MediaRoomsProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [creatingGroupKey, setCreatingGroupKey] = useState<string | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const rooms: MediaRoom[] = (state.rooms || []).filter((room) => !room.archivedAt && canViewRoom(room, currentRoleIds, canManageRooms));
  const grouped = groupedChannelItems(rooms, "General");
  const groups = grouped.length || !canManageRooms ? grouped : [{ key: "general", label: "General", items: [] }];
  const canCreateRooms = canManageRooms && Boolean(onCreate);

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

  function toggleCreateGroup(groupKey: string) {
    setNewRoomName("");
    setCreatingGroupKey((current) => current === groupKey ? undefined : groupKey);
  }

  async function createRoom(event: React.FormEvent<HTMLFormElement>, groupLabel: string) {
    event.preventDefault();
    const name = newRoomName.trim();
    if (!name || !onCreate) return;
    await onCreate({ name, group: optionalChannelGroup(groupLabel) });
    setNewRoomName("");
    setCreatingGroupKey(undefined);
  }

  function voiceMemberActions(member: { memberId?: string; participantId: string }): MemberContextMenuAction[] {
    if (!onToggleVoiceParticipantMute || member.memberId === currentUserId) return [];
    const muted = Boolean(mutedVoiceParticipantIds[member.participantId]);
    return [{
      id: "voice-mute",
      label: muted ? "Unmute" : "Mute",
      onSelect: () => onToggleVoiceParticipantMute(member.participantId)
    }];
  }

  return (
    <div className="channel-group-list voice-channel-groups">
      {groups.length === 0 ? <p className="sidebar-empty">No voice channels</p> : null}
      {groups.map((group) => {
        const collapsed = Boolean(collapsedGroups[group.key]);
        const creating = creatingGroupKey === group.key;
        return (
          <div className="channel-group voice-channel-group" key={group.key}>
            <div className={`channel-group-heading${canCreateRooms ? " has-add" : ""}`}>
              <button className="channel-group-toggle" type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(group.key)}>
                <span>{group.label}</span>
                <ChevronRightIcon className={`ui-icon channel-group-chevron${collapsed ? "" : " open"}`} />
              </button>
              {canCreateRooms ? (
                <button
                  className="sidebar-icon-button channel-group-add"
                  type="button"
                  aria-label={creating ? `Cancel new voice channel in ${group.label}` : `Add voice channel to ${group.label}`}
                  aria-expanded={creating}
                  onClick={() => toggleCreateGroup(group.key)}
                >
                  <PlusIcon className={`ui-icon${creating ? " open" : ""}`} />
                </button>
              ) : null}
            </div>
            {creating ? (
              <form className="sidebar-form channel-create-form" onSubmit={(event) => createRoom(event, group.label)}>
                <label>
                  <span>Name</span>
                  <input aria-label={`New voice channel name in ${group.label}`} value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} placeholder="Voice channel" />
                </label>
                <button className="primary-action" type="submit" disabled={!newRoomName.trim()}>
                  Create
                </button>
              </form>
            ) : null}
            {!collapsed ? (
              <div className="media-room-list channel-group-items">
                {group.items.map((room) => {
                  const active = activeRoomId === room.id;
                  const selected = selectedRoomId === room.id || active;
                  const joinable = canEditRoom(room, currentRoleIds, canManageRooms);
                  const members = connectedVoiceMembers(voiceTokens, room.id);
                  return (
                    <article className={`media-room${selected ? " selected" : ""}${active ? " active" : ""}`} key={room.id}>
                      <button className="media-room-join" type="button" aria-label={joinable ? `Join ${room.name}` : `${room.name} is read only`} disabled={!joinable} onClick={() => onJoin(room, { audio: true, video: false })}>
                        <SpeakerIcon className={`ui-icon voice-room-icon${active ? " active" : ""}`} />
                        <span className="media-room-title">
                          <strong>{room.name}</strong>
                        </span>
                      </button>
                      {members.length ? (
                        <ul className="voice-member-list" aria-label={`Connected users in ${room.name}`}>
                          {members.map((member) => (
                            <li className="voice-member-item" key={member.key}>
                              <MemberContextMenu
                                additionalActions={voiceMemberActions(member)}
                                currentUserId={currentUserId}
                                memberId={member.memberId}
                                memberName={member.name}
                                onDirectMessage={onDirectMessage}
                              >
                                <Avatar name={member.name} avatar={member.avatar} small />
                              </MemberContextMenu>
                              <span>{member.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
