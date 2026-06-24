import type { ChatEmbed, ChatState, CommentThread, MemberModeration, Message, PublicInvite, JoinRequest, ScopedReaction } from "@entities/chat/model/types";

export function emptyChatState(): ChatState {
  return {
    channels: [],
    messages: {},
    guests: {},
    publicInvites: [],
    joinRequests: {},
    directThreads: {},
    directMessages: {},
    rooms: [],
    screenShares: {},
    members: {},
    presence: {},
    activity: [],
    commentThreads: {},
    comments: {},
    embeds: {},
    reactions: {},
    roleDefinitions: {},
    access: { version: 1, roleIds: [], scopes: {} }
  };
}

function adminState(state: ChatState) {
  return state as ChatState & {
    guests?: Record<string, MemberModeration>;
    publicInvites?: PublicInvite[];
    joinRequests?: Record<string, JoinRequest>;
  };
}

export function memberModerationFor(state: ChatState, memberId?: string): MemberModeration | undefined {
  if (!memberId) return undefined;
  return adminState(state).guests?.[memberId];
}

export function memberChatDisabled(state: ChatState, memberId?: string): boolean {
  const moderation = memberModerationFor(state, memberId);
  return Boolean(moderation?.chatDisabled || moderation?.bannedAt);
}

export function publicInvitesForState(state: ChatState): PublicInvite[] {
  return adminState(state).publicInvites || [];
}

export function joinRequestsForState(state: ChatState): JoinRequest[] {
  return Object.values(adminState(state).joinRequests || {});
}

function safeThreadPart(value: string) {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80) || "user";
}

export function normalizeUserIds(userIds: string[]): string[] {
  return [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].sort();
}

export function directThreadIdForUsers(userIds: string[]): string {
  const users = normalizeUserIds(userIds);
  return `dm_${users.map(safeThreadPart).join("__")}`;
}

export function isCoreDirectThread(_thread: { protocol?: string }) {
  return true;
}

export function isCoreDirectMessage(_message: { protocol?: string }) {
  return true;
}

export function channelMessages(state: ChatState, channelId?: string): Message[] {
  if (!channelId) return [];
  const messages = Object.values(state.messages || {})
    .filter((message) => message.channelId === channelId)
    .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
  return visibleChannelMessages(messages);
}

export function visibleChannelMessages(messages: Message[]): Message[] {
  let lastVisibleIndex = messages.length - 1;
  while (lastVisibleIndex >= 0 && messages[lastVisibleIndex].deletedAt) lastVisibleIndex -= 1;
  return messages.filter((message, index) => !message.deletedAt || index < lastVisibleIndex);
}

export function directMessages(state: ChatState, threadId?: string): Message[] {
  if (!threadId) return [];
  return Object.values(state.directMessages || {})
    .filter((message) => message.threadId === threadId && isCoreDirectMessage(message) && !message.deletedAt)
    .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
}

export function latestDirectMessageTime(state: ChatState, threadId?: string): number {
  if (!threadId) return 0;
  return directMessages(state, threadId).reduce((latest, message) => Math.max(latest, Number(message.createdAt || 0)), 0);
}

export function activeScreenShareCount(state: ChatState, roomId?: string) {
  return Object.values(state.screenShares || {}).filter((share) => !share.stoppedAt && (!roomId || share.roomId === roomId || share.scopeId === roomId)).length;
}

export function participantCount(room: { participants?: Record<string, unknown> | string[] }) {
  return Array.isArray(room.participants) ? room.participants.length : Object.keys(room.participants || {}).length;
}

export function reactionCount(reactions?: Record<string, string[]>) {
  return Object.values(reactions || {}).reduce((sum, members) => sum + members.length, 0);
}

export function channelEmbeds(state: ChatState, channelId?: string): ChatEmbed[] {
  if (!channelId) return [];
  return Object.values(state.embeds || {})
    .filter((embed) => !embed.removedAt && embed.scopeType === "channel" && embed.scopeId === channelId)
    .sort((left, right) => (right.addedAt || 0) - (left.addedAt || 0));
}

export function channelThreads(state: ChatState, channelId?: string): CommentThread[] {
  if (!channelId) return [];
  return Object.values(state.commentThreads || {})
    .filter((thread) => thread.scopeType === "channel" && thread.scopeId === channelId)
    .sort((left, right) => (right.lastCommentAt || right.createdAt || 0) - (left.lastCommentAt || left.createdAt || 0));
}

export function scopedReactionCount(reaction?: ScopedReaction) {
  return reactionCount(reaction?.reactions);
}
