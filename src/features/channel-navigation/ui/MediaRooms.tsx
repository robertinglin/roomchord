import React from "react";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import type { EphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import type { ChatState, MediaRoom } from "@entities/chat/model/types";
import { canEditRoom, canViewRoom } from "@entities/chat/model/roles";
import { sharedPinnedChannelKeys } from "@entities/chat/model/state";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";
import { ChannelRow, SpeakerGlyph, VoiceMember, VoiceMembers } from "@shared/ui/design";

export type MediaRoomsProps = {
  state: ChatState;
  activeRoomId?: string;
  selectedRoomId?: string;
  voiceTokens: EphemeralToken[];
  canManageRooms: boolean;
  currentUserId?: string;
  currentRoleIds: string[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onCreate?: (input: { name: string; categoryId: string; position: number }) => void | Promise<void>;
  onArchive?: (roomId: string) => void | Promise<void>;
  onDirectMessage?: (memberId: string) => void;
  onOpenInvites?: () => void;
  onOpenSettings?: (roomId: string) => void;
  onJoin: (room: MediaRoom, media: CallMediaSettings) => void;
  onReorder?: (roomId: string, categoryId: string, position: number) => void | Promise<void>;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
};

function tokenVoiceStatus(token: EphemeralToken) {
  const status = token.payload?.voiceStatus;
  if (!status || typeof status !== "object") return {};
  return status as { deafened?: boolean; muted?: boolean };
}

function connectedVoiceMembers(tokens: EphemeralToken[], roomId: string) {
  const members: Array<{ avatar?: string; deafened: boolean; key: string; memberId?: string; muted: boolean; name: string; participantId: string }> = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.scope !== roomId) continue;
    const participantId = token.clientId || token.ownerId || token.id;
    if (seen.has(participantId)) continue;
    seen.add(participantId);
    const status = tokenVoiceStatus(token);
    const media = token.payload?.media;
    members.push({
      avatar: typeof token.payload?.avatar === "string" ? token.payload.avatar : undefined,
      deafened: status.deafened === true,
      key: participantId,
      memberId: token.ownerId,
      muted: status.muted === true || Boolean(media && typeof media === "object" && (media as CallMediaSettings).audio === false),
      name: token.ownerName || token.ownerId || token.clientId || "Connected user",
      participantId,
    });
  }
  return members;
}

export function visibleMediaRooms({ state, canManageRooms, currentRoleIds }: MediaRoomsProps) {
  return (state.rooms || []).filter((room) => !room.archivedAt && canViewRoom(room, currentRoleIds, canManageRooms));
}

export function MediaRoomItem({ room, controller, dragProps, dragging, hideNames = false }: {
  room: MediaRoom;
  controller: MediaRoomsProps;
  dragProps?: React.HTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  dragging?: boolean;
  hideNames?: boolean;
}) {
  const active = controller.activeRoomId === room.id;
  const selected = controller.selectedRoomId === room.id || active;
  const pinned = sharedPinnedChannelKeys(controller.state).has(`voice:${room.id}`);
  const joinable = canEditRoom(room, controller.currentRoleIds, controller.canManageRooms);
  const members = connectedVoiceMembers(controller.voiceTokens, room.id);

  function voiceMemberActions(member: { memberId?: string; participantId: string }): MemberContextMenuAction[] {
    if (!controller.onToggleVoiceParticipantMute || member.memberId === controller.currentUserId) return [];
    const muted = Boolean(controller.mutedVoiceParticipantIds?.[member.participantId]);
    return [{ id: "voice-mute", label: muted ? "Unmute" : "Mute", onSelect: () => controller.onToggleVoiceParticipantMute?.(member.participantId) }];
  }

  return (
    <article>
      <ChannelRow
        voice
        icon={<SpeakerGlyph size={18} />}
        pinned={pinned}
        name={room.name}
        active={selected}
        disabled={!joinable}
        dragging={dragging}
        dragProps={dragProps}
        aria-label={joinable ? `Join ${room.name}` : `${room.name} is read only`}
        onClick={() => controller.onJoin(room, { audio: true, video: false })}
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
              hideName={hideNames}
              wrap={(children) => (
                <MemberContextMenu
                  additionalActions={voiceMemberActions(member)}
                  currentUserId={controller.currentUserId}
                  memberId={member.memberId}
                  memberName={member.name}
                  onDirectMessage={controller.onDirectMessage}
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
}
