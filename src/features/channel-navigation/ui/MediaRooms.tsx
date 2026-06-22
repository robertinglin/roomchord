import React, { useState } from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import type { MatterhornEphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import { groupedChannelItems, optionalChannelGroup } from "@entities/chat/model/channelGroups";
import type { ChatState, MediaRoom } from "@entities/chat/model/types";
import { canEditRoom, canViewRoom } from "@entities/chat/model/roles";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";
import {
  ChannelCreateForm,
  ChannelGroup,
  ChannelRow,
  VoiceMember,
  VoiceMembers,
} from "@shared/ui/design";
import { SpeakerGlyph } from "@shared/ui/design/icons";

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

function tokenMuted(token: MatterhornEphemeralToken) {
  const media = token.payload?.media;
  if (!media || typeof media !== "object") return false;
  return (media as CallMediaSettings).audio === false;
}

function tokenVoiceStatus(token: MatterhornEphemeralToken) {
  const status = token.payload?.voiceStatus;
  if (!status || typeof status !== "object") return {};
  const value = status as { deafened?: unknown; muted?: unknown };
  return {
    deafened: value.deafened === true,
    muted: value.muted === true
  };
}

function connectedVoiceMembers(tokens: MatterhornEphemeralToken[], roomId: string) {
  const members: Array<{ avatar?: string; deafened: boolean; key: string; memberId?: string; muted: boolean; name: string; participantId: string }> = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.scope !== roomId) continue;
    const participantId = token.clientId || token.ownerId || token.id;
    if (seen.has(participantId)) continue;
    seen.add(participantId);
    const voiceStatus = tokenVoiceStatus(token);
    members.push({
      avatar: tokenAvatar(token),
      deafened: voiceStatus.deafened === true,
      key: participantId,
      memberId: token.ownerId,
      muted: voiceStatus.muted === true || tokenMuted(token),
      name: token.ownerName || token.ownerId || token.clientId || "Connected user",
      participantId
    });
  }
  return members;
}

function optionalVoiceRoomGroup(groupLabel: string) {
  return groupLabel === "Voice Rooms" ? undefined : optionalChannelGroup(groupLabel);
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
  const query = searchQuery.trim().toLowerCase();
  const rooms: MediaRoom[] = (state.rooms || []).filter((room) => {
    if (room.archivedAt || !canViewRoom(room, currentRoleIds, canManageRooms)) return false;
    if (!query) return true;
    return [room.name, room.group].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
  });
  const grouped = groupedChannelItems(rooms, "Voice Rooms");
  const groups = grouped.length || !canManageRooms ? grouped : [{ key: "voice-rooms", label: "Voice Rooms", items: [] }];
  const canCreateRooms = canManageRooms && Boolean(onCreate);

  function toggleCreateGroup(groupKey: string) {
    setCreatingGroupKey((current) => (current === groupKey ? undefined : groupKey));
  }

  async function createRoom(name: string, groupLabel: string) {
    if (!onCreate) return;
    await onCreate({ name, group: optionalVoiceRoomGroup(groupLabel) });
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
      {groups.map((group) => {
        const collapsed = Boolean(collapsedGroups[group.key]);
        const creating = creatingGroupKey === group.key;
        return (
          <ChannelGroup
            key={group.key}
            label={group.label}
            open={!collapsed}
            onToggle={() => setCollapsedGroups((c) => ({ ...c, [group.key]: !c[group.key] }))}
            onAdd={canCreateRooms ? () => toggleCreateGroup(group.key) : undefined}
          >
            {creating ? (
              <ChannelCreateForm
                placeholder="Voice channel"
                ariaLabel={`New voice channel name in ${group.label}`}
                onSubmit={(name) => createRoom(name, group.label)}
              />
            ) : null}
            {!collapsed
              ? group.items.map((room) => {
                  const active = activeRoomId === room.id;
                  const selected = selectedRoomId === room.id || active;
                  const joinable = canEditRoom(room, currentRoleIds, canManageRooms);
                  const members = connectedVoiceMembers(voiceTokens, room.id);
                  return (
                    <article key={room.id}>
                      <ChannelRow
                        voice
                        icon={<SpeakerGlyph size={18} />}
                        name={room.name}
                        active={selected}
                        disabled={!joinable}
                        aria-label={joinable ? `Join ${room.name}` : `${room.name} is read only`}
                        onClick={() => onJoin(room, { audio: true, video: false })}
                      />
                      {members.length ? (
                        <VoiceMembers aria-label={`Connected users in ${room.name}`}>
                          {members.map((member) => (
                            <VoiceMember
                              key={member.key}
                              avatar={member.avatar}
                              deafened={member.deafened}
                              muted={member.muted}
                              name={member.name}
                              wrap={(children) => (
                                <MemberContextMenu
                                  additionalActions={voiceMemberActions(member)}
                                  currentUserId={currentUserId}
                                  memberId={member.memberId}
                                  memberName={member.name}
                                  onDirectMessage={onDirectMessage}
                                >
                                  {children}
                                </MemberContextMenu>
                              )}
                            />
                          ))}
                        </VoiceMembers>
                      ) : null}
                    </article>
                  );
                })
              : null}
          </ChannelGroup>
        );
      })}
    </div>
  );
}
