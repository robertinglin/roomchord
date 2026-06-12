import type { Chord } from "../../../../../src/types";

export type AvatarSource = { avatar?: string; avatarUrl?: string; profileImageUrl?: string };
export type Actor = Chord.Actor & AvatarSource;
export type ChannelId = Chord.ChannelId;
export type CommentId = Chord.CommentId;
export type EmbedId = Chord.EmbedId;
export type MemberId = Chord.MemberId;
export type MessageId = Chord.MessageId;
export type RoleId = Chord.RoleId;
export type RoomId = Chord.RoomId;
export type ShareId = Chord.ShareId;
export type ThreadId = Chord.ThreadId;
export type RoomMember = Chord.Member & AvatarSource;
export type Channel = Chord.Channel;
export type RoomRoleAccessLevel = Chord.AccessLevel;
export type RoomRoleAccess = Chord.RoomRoleAccess;

export type Message = (Chord.Message | Chord.DirectMessage) & {
  authorName?: string;
  authorAvatar?: string;
  authorAvatarUrl?: string;
  authorImageUrl?: string;
};

export type DirectThread = Chord.DirectThread;
export type DirectMessageThread = Chord.DirectMessageThread;

export type MediaRoomParticipant = Chord.MediaRoomParticipant;
export type MediaRoom = Omit<Chord.MediaRoom, "participants"> & {
  participants?: Record<string, MediaRoomParticipant> | string[];
};

export type ScreenShare = Chord.ScreenShare & {
  ownerId?: string;
  ownerName?: string;
};

export type Presence = Chord.PresenceMember & AvatarSource;

export type ChatEmbed = Chord.Embed;
export type CommentThread = Chord.CommentThread;
export type ThreadComment = Chord.Comment;
export type ScopedReaction = Chord.ScopedReaction;
export type RoleDefinition = Chord.RoleDefinition;
export type MemberRoleAssignment = Chord.MemberRole;

export type ChatState = Chord.State;

export type ChatProps = { envelope?: Chord.LaunchEnvelope; initialState?: Chord.LaunchEnvelope["initialState"] };
export type ChatActionName = Chord.ActionName;
export type ChatActionPayload<K extends ChatActionName> = Chord.Actions[K];
export type ChatDispatchResult = unknown;
export type ChatCore = Chord.Core;
