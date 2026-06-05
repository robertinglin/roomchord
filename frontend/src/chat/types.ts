import type { Chord } from "../../../src/types";

export type AvatarSource = { avatar?: string; avatarUrl?: string; profileImageUrl?: string };
export type Actor = Chord.Actor & AvatarSource;
export type RoomMember = Chord.Member & AvatarSource;
export type Channel = Partial<Chord.Channel> & { id: string; name: string };
export type RoomRoleAccessLevel = Chord.AccessLevel;
export type RoomRoleAccess = Chord.RoomRoleAccess;

export type Message = Omit<Chord.Message | Chord.DirectMessage, "authorId" | "createdAt" | "reactions" | "embeds"> & {
  id: string;
  body: string;
  protocol?: string;
  channelId?: string;
  threadId?: string;
  authorName?: string;
  authorId?: string;
  authorAvatar?: string;
  authorAvatarUrl?: string;
  authorImageUrl?: string;
  reactions?: Chord.Reactions;
  createdAt?: number;
  embeds?: unknown[];
};

export type DirectThread = Partial<Chord.DirectThread> & {
  id: string;
  protocol?: string;
  userIds?: string[];
};
export type DirectMessageThread = { thread: DirectThread; messages: Message[] };

export type MediaRoomParticipant = Partial<Chord.MediaRoomParticipant>;
export type MediaRoom = Omit<Partial<Chord.MediaRoom>, "participants" | "roleAccess"> & {
  id: string;
  name: string;
  participants?: Record<string, MediaRoomParticipant> | string[];
  roleAccess?: RoomRoleAccess;
};

export type ScreenShare = Partial<Chord.ScreenShare> & {
  id: string;
  ownerId?: string;
  ownerName?: string;
};

export type Presence = Partial<Chord.PresenceMember> & {
  status: Chord.PresenceStatus;
} & AvatarSource;

export type ChatEmbed = Partial<Chord.Embed> & { id: string };
export type CommentThread = Partial<Chord.CommentThread> & { id: string };
export type ThreadComment = Omit<Partial<Chord.Comment>, "reactions"> & {
  id: string;
  threadId: string;
  body: string;
  reactions?: Chord.Reactions;
};
export type CommentsState = Omit<Chord.CommentsPluginState, "threads" | "comments"> & {
  threads: Record<string, CommentThread>;
  comments: Record<string, ThreadComment>;
};
export type ScopedReaction = Partial<Chord.ScopedReaction>;
export type RoleDefinition = Partial<Chord.RoleDefinition> & { id: string; name: string };
export type MemberRoleAssignment = Partial<Chord.MemberRole> & { memberId: string };

export type ChatState = Omit<
  Chord.State,
  | "activity"
  | "channels"
  | "comments"
  | "directMessages"
  | "directThreads"
  | "embeds"
  | "memberRoles"
  | "members"
  | "messages"
  | "presence"
  | "reactions"
  | "roleDefinitions"
  | "rooms"
  | "screenShares"
> & {
  activity: Array<{ id: string; message: string }>;
  channels: Channel[];
  comments: CommentsState;
  directMessages: Record<string, Message>;
  directThreads: Record<string, DirectThread>;
  directKeys?: Record<string, unknown>;
  embeds: Record<string, ChatEmbed>;
  memberRoles?: Record<string, MemberRoleAssignment>;
  members: Record<string, RoomMember>;
  messages: Record<string, Message>;
  presence: Record<string, Presence>;
  reactions: Record<string, ScopedReaction>;
  roleDefinitions?: Record<string, RoleDefinition>;
  rooms: MediaRoom[];
  screenShares: Record<string, ScreenShare>;
  access?: unknown;
};

export type ChatProps = { envelope?: Chord.LaunchEnvelope; initialState?: ChatState };
export type ChatActionName = Chord.ActionName;
export type ChatActionPayload<K extends ChatActionName> = Chord.Actions[K];
export type ChatDispatchResult = { ok: true; state: ChatState } | { ok: false; reason: string; state?: ChatState };
export type ChatCore = Chord.Core;
