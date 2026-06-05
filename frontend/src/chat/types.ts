import type { Chord } from "../../../src/types";

export type AvatarSource = { avatar?: string; avatarUrl?: string; profileImageUrl?: string };
export type Actor = Chord.Actor & AvatarSource;
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

export type ChatState = Chord.State;

export type ChatProps = { envelope?: Chord.LaunchEnvelope; initialState?: ChatState };
export type ChatActionName = Chord.ActionName;
export type ChatActionPayload<K extends ChatActionName> = Chord.Actions[K];
export type ChatDispatchResult = Chord.DispatchResult;
export type ChatCore = Chord.Core;
