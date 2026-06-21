import React, { useState } from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import type { MatterhornEphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import { groupedChannelItems, optionalChannelGroup } from "@entities/chat/model/channelGroups";
import type { ChatState, MediaRoom } from "@entities/chat/model/types";
import { canEditRoom, canViewRoom } from "@entities/chat/model/roles";
import { Avatar } from "@shared/ui/Avatar";
import { ChevronRightIcon, PlusIcon, SpeakerIcon } from "@shared/ui/Icons";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";

export type MediaRoomsProps = {
  state: ChatState;
  activeRoomId?: string;
  selectedRoomId?: string;
  voiceTokens: MatterhornEphemeralToken[];
  canManageRooms: boolean;
  currentUserId?: string;
  currentRoleIds: string[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  searchQuery?: string;
  onCreate?: (input: { name: string; group?: string }) => void | Promise<void>;
  onDirectMessage?: (memberId: string) => void;
  onJoin: (room: MediaRoom, media: CallMediaSettings) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
};

function tokenAvatar(token: MatterhornEphemeralToken) {
  return typeof token.payload?.avatar === "string" ? token.payload.avatar : undefined;
}

function connectedVoiceMembers(tokens: MatterhornEphemeralToken[], roomId: string) {
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
  searchQuery = "",
  onCreate,
  onDirectMessage,
  onJoin,
  onToggleVoiceParticipantMute
}: MediaRoomsProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [creatingGroupKey, setCreatingGroupKey] = useState<string | undefined>();
  const [newRoomName, setNewRoomName] = useState("");
  const query = searchQuery.trim().toLowerCase();
  const rooms: MediaRoom[] = (state.rooms || []).filter((room) => {
    if (room.archivedAt || !canViewRoom(room, currentRoleIds, canManageRooms)) return false;
    if (!query) return true;
    return [room.name, room.group].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
  });
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
    <div>
      {groups.length === 0 ? <p className="sidebar-empty">{query ? "No matching voice rooms" : "No voice channels"}</p> : null}
      {groups.map((group) => {
        const collapsed = Boolean(collapsedGroups[group.key]);
        const creating = creatingGroupKey === group.key;
        return (
          <div className="group" key={group.key}>
            <div className="grp-head">
              <button className="grp-toggle" type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(group.key)}>
                <ChevronRightIcon className={`ico chev${collapsed ? "" : " open"}`} />
                <span>{group.label}</span>
              </button>
              {canCreateRooms ? (
                <button
                  className="grp-add"
                  type="button"
                  aria-label={creating ? `Cancel new voice channel in ${group.label}` : `Add voice channel to ${group.label}`}
                  aria-expanded={creating}
                  onClick={() => toggleCreateGroup(group.key)}
                >
                  <PlusIcon className="ico" />
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
              <div>
                {group.items.map((room) => {
                  const active = activeRoomId === room.id;
                  const selected = selectedRoomId === room.id || active;
                  const joinable = canEditRoom(room, currentRoleIds, canManageRooms);
                  const members = connectedVoiceMembers(voiceTokens, room.id);
                  return (
                    <article key={room.id}>
                      <button className={`chan${selected ? " active" : ""}`} type="button" aria-label={joinable ? `Join ${room.name}` : `${room.name} is read only`} disabled={!joinable} onClick={() => onJoin(room, { audio: true, video: false })}>
                        <SpeakerIcon className={`ico ch-ic${active ? " active" : ""}`} />
                        <span className="ch-name">{room.name}</span>
                        {members.length ? <span className="voice-count">{members.length}</span> : null}
                      </button>
                      {members.length ? (
                        <ul className="voice-members" aria-label={`Connected users in ${room.name}`}>
                          {members.map((member) => (
                            <li className="vm" key={member.key}>
                              <MemberContextMenu
                                additionalActions={voiceMemberActions(member)}
                                currentUserId={currentUserId}
                                memberId={member.memberId}
                                memberName={member.name}
                                onDirectMessage={onDirectMessage}
                              >
                                <Avatar className="vm-av" name={member.name} avatar={member.avatar} small />
                              </MemberContextMenu>
                              <span className="vm-name">{member.name}</span>
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
