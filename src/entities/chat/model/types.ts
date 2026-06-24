import type { Mosh } from "../../../../types";
import type { MtnHomeData, MtnHomeOpenRoomDetail } from "matterhorn-sdk/browser";

export type AvatarSource = { avatar?: string; avatarUrl?: string; profileImageUrl?: string };
export type Actor = Mosh.Actor & AvatarSource;
export type ChannelId = Mosh.ChannelId;
export type CommentId = Mosh.CommentId;
export type EmbedId = Mosh.EmbedId;
export type MemberId = Mosh.MemberId;
export type MessageId = Mosh.MessageId;
export type RoleId = Mosh.RoleId;
export type RoomId = Mosh.RoomId;
export type ShareId = Mosh.ShareId;
export type ThreadId = Mosh.ThreadId;
export type RoomMember = Mosh.Member & AvatarSource;
export type Channel = Mosh.Channel;
export type RoomRoleAccessLevel = Mosh.AccessLevel;
export type RoomRoleAccess = Mosh.RoomRoleAccess;

export type Message = (Mosh.Message | Mosh.DirectMessage) & {
  authorName?: string;
  authorAvatar?: string;
  authorAvatarUrl?: string;
  authorImageUrl?: string;
};

export type DirectThread = Mosh.DirectThread;
export type DirectMessageThread = Mosh.DirectMessageThread;

export type MediaRoomParticipant = Mosh.MediaRoomParticipant;
export type MediaRoom = Omit<Mosh.MediaRoom, "participants"> & {
  participants?: Record<string, MediaRoomParticipant> | string[];
};

export type ScreenShare = Mosh.ScreenShare & {
  ownerId?: string;
  ownerName?: string;
};

export type Presence = Mosh.PresenceMember & AvatarSource;

export type ChatEmbed = Mosh.Embed;
export type CommentThread = Mosh.CommentThread;
export type ThreadComment = Mosh.Comment;
export type ScopedReaction = Mosh.ScopedReaction;
export type RoleDefinition = Mosh.RoleDefinition;
export type MemberRoleAssignment = {
  memberId?: string;
  roleId?: string | null;
  roleIds?: string[];
  displayName?: string | null;
  assignedBy?: string;
  assignedAt?: number;
};
export type MemberModeration = {
  memberId?: string;
  nameLocked?: boolean | null;
  chatDisabled?: boolean | null;
  bannedAt?: number | null;
  banReason?: string | null;
};
export type PublicInvite = {
  id: string;
  status?: string;
  disabledAt?: number | null;
  removedAt?: number | null;
};
export type JoinRequest = {
  id: string;
  inviteId?: string;
  profileId?: string;
  profile?: { name?: string; avatar?: string };
  status?: string;
  decidedAt?: number | null;
};

export type ChatState = Mosh.State;

export type ChatProps = {
  envelope?: Mosh.LaunchEnvelope;
  initialState?: Mosh.LaunchEnvelope["initialState"];
  home?: MtnHomeData;
  launchHome?: MtnHomeData;
  openRoom?: (detail: MtnHomeOpenRoomDetail) => void;
  onOpenLaunchHomeRoom?: (detail: MtnHomeOpenRoomDetail) => void;
};
export type ChatActionName = Mosh.ActionName;
export type ChatActionPayload<K extends ChatActionName> = Mosh.Actions[K];
export type ChatDispatchResult = unknown;
export type ChatCore = Mosh.Core;
