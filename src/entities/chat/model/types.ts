import type { Mosh } from "../../../../types";
import type { MtnHomeData, MtnHomeOpenRoomDetail } from "matterhorn-sdk/browser";
import type { MatterhornCustomMediaMessageReference } from "matterhorn-sdk/browser";
import type { CommentThread, ThreadComment } from "@shared/model/commentThreads";

export type { CommentThread, ThreadComment } from "@shared/model/commentThreads";

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
export type ChannelVisibility = "public" | "private";
export type ChannelCategory = {
  id: string;
  name: string;
  position: number;
  archivedAt?: number | null;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
};
export type ChannelAccessConfig = {
  visibility?: ChannelVisibility;
  allowedRoleIds?: string[];
  allowedMemberIds?: string[];
};
export type Channel = Mosh.Channel & {
  kind?: "text" | "forum" | "announcement" | "onboarding" | "rules" | "voice-text" | "stage";
  mediaRoomId?: string;
  postingPolicy?: "members" | "moderators" | "none";
  speakerPolicy?: "members" | "moderators" | "none";
  threadPolicy?: "members" | "moderators" | "none";
  categoryId?: string | null;
  position?: number;
} & ChannelAccessConfig;
export type RoomRoleAccessLevel = "hidden" | "readonly" | "editor";
export type RoomRoleAccess = Record<string, "readonly" | "editor">;

export type ForwardedMessageSource = {
  kind: "channel" | "direct.thread";
  scopeId: string;
  messageId: string;
};

export type Message = (Mosh.Message | Mosh.DirectMessage) & {
  attachmentIds?: string[];
  threadId?: ThreadId;
  userIds?: MemberId[];
  topicKey?: string | null;
  authorName?: string;
  authorAvatar?: string;
  authorAvatarUrl?: string;
  authorImageUrl?: string;
  forwardedFrom?: ForwardedMessageSource | null;
  forwardedFromId?: string | null;
  customMediaRefs?: MatterhornCustomMediaMessageReference[];
};

export type DirectThread = Mosh.DirectThread;
export type DirectMessageThread = Mosh.DirectMessageThread;

export type MediaRoomParticipant = Mosh.MediaRoomParticipant & {
  deafened?: boolean;
  moderationAt?: number;
  moderationReason?: string | null;
  moderationRevision?: number;
  muted?: boolean;
  suppressed?: boolean;
};
export type MediaRoomStage = {
  closedAt?: number | null;
  open?: boolean;
  openedAt?: number | null;
  requests?: Record<string, { memberId?: string; requestedAt?: number; operationId?: string }>;
  speakers?: Record<string, boolean>;
};
export type MediaRoom = {
  id: RoomId;
  name: string;
  group: string | null;
  allowsVideo: boolean;
  scopeType?: string;
  scopeId?: string;
  locked: boolean;
  spotlightMemberId?: MemberId | null;
  archivedAt: number | null;
  participantCount: number;
  createdBy?: MemberId;
  createdAt?: number;
  roleAccess?: RoomRoleAccess;
  participants?: Record<string, MediaRoomParticipant> | string[];
  blockedMembers?: Record<string, { actorId?: string; reason?: string | null; at?: number }>;
  kind?: "voice" | "stage";
  stage?: MediaRoomStage;
};

export type ScreenShare = Mosh.ScreenShare & {
  ownerId?: string;
  ownerName?: string;
};

export type Presence = AvatarSource & {
  memberId?: string;
  name?: string;
  status?: string;
  activity?: string | null;
  location?: string | null;
  updatedAt?: number;
  lastPingAt?: number;
  visible?: boolean;
  serviceHealth?: Mosh.RoomPresence["serviceHealth"];
};

export type ChatEmbed = Mosh.Embed;
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
  avatar?: string | null;
  callClientId?: string;
  callPubkey?: string;
  callUpdatedAt?: number;
  nameLocked?: boolean | null;
  chatDisabled?: boolean | null;
  bannedAt?: number | null;
  banReason?: string | null;
  name?: string | null;
  peerAddress?: string;
  peerId?: string;
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
