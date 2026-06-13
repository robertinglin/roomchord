import { matterhornDisplayName } from "matterhorn-sdk/browser/displayName";
import { parseMarkdown, type MarkdownEmbed } from "matterhorn-sdk/browser/markdown";
import type { Actor, AvatarSource, ChatState, DirectThread, MemberId, Message, MessageId, RoomMember, ThreadId } from "@entities/chat/model/types";
import {
  CHAT_DIRECT_PROTOCOL,
  channelEmbeds,
  channelMessages,
  channelThreads,
  directThreadIdForUsers,
  isCoreDirectMessage,
  isCoreDirectThread,
  normalizeUserIds
} from "@entities/chat/model/state";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";

export type LinkedMessageLocation =
  | { messageId: string; view: "channel"; channelId: string }
  | { messageId: string; view: "dm"; threadId: string };

export function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

export function messageEmbeds(body: string): MarkdownEmbed[] {
  try {
    const seen = new Set<string>();
    return parseMarkdown(body).embeds.filter((embed) => {
      if (!embed?.url || seen.has(embed.url)) return false;
      seen.add(embed.url);
      return true;
    });
  } catch {
    return [];
  }
}

export function linkedMessageLocation(state: ChatState, hash: string, messageIdFromHash: (hash: string) => string | undefined): LinkedMessageLocation | undefined {
  const messageId = messageIdFromHash(hash);
  if (!messageId) return undefined;
  const channelMessage = state.messages?.[messageId as MessageId];
  if (channelMessage?.channelId && !channelMessage.deletedAt) {
    return { messageId, view: "channel", channelId: channelMessage.channelId };
  }
  const directMessage = state.directMessages?.[messageId as MessageId];
  if (directMessage?.threadId && !directMessage.deletedAt && isCoreDirectMessage(directMessage)) {
    return { messageId, view: "dm", threadId: directMessage.threadId };
  }
  return undefined;
}

function roomMemberName(member: RoomMember, id: string) {
  return matterhornDisplayName({ member, fallbackId: id });
}

export function memberNamesForState(state: ChatState, actor: Actor): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [key, member] of Object.entries(state.members || {})) {
    const id = member.memberId || member.id || key;
    if (id) names[id] = roomMemberName(member, id);
  }
  for (const [key, item] of Object.entries(state.presence || {})) {
    const id = item.memberId || key;
    if (id) names[id] = matterhornDisplayName({ presence: item, member: state.members?.[id as MemberId], fallback: names[id], fallbackId: id });
  }
  names[actor.memberId] = matterhornDisplayName({ actor, fallback: names[actor.memberId], fallbackId: actor.memberId });
  return names;
}

function avatarValue(source?: AvatarSource) {
  return source?.profileImageUrl || source?.avatarUrl || source?.avatar;
}

export function avatarForActor(actor: Actor) {
  return avatarValue(actor);
}

export function memberAvatarsForState(state: ChatState, actor: Actor): Record<string, string> {
  const avatars: Record<string, string> = {};
  for (const [key, member] of Object.entries(state.members || {})) {
    const id = member.memberId || member.id || key;
    const avatar = avatarValue(member);
    if (id && avatar) avatars[id] = avatar;
  }
  for (const [key, item] of Object.entries(state.presence || {})) {
    const id = item.memberId || key;
    const avatar = avatarValue(item);
    if (id && avatar) avatars[id] = avatar;
  }
  const actorAvatar = avatarValue(actor);
  if (actorAvatar) avatars[actor.memberId] = actorAvatar;
  return avatars;
}

export function isMessageAuthor(actor: Actor, message: Message) {
  return Boolean(message.authorId && message.authorId === actor.memberId);
}

export function canDeleteMessage(actor: Actor, message: Message, canManageMessages: boolean) {
  return isMessageAuthor(actor, message) || canManageMessages;
}

export function hasDirectMessages(state: ChatState, threadId: string) {
  return Object.values(state.directMessages || {}).some((message) => message.threadId === threadId && isCoreDirectMessage(message) && !message.deletedAt);
}

function sameParticipants(left: string[] | undefined, right: string[]) {
  const a = normalizeUserIds(left || []);
  const b = normalizeUserIds(right);
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function directThreadForUsers(state: ChatState, userIds: string[]) {
  return Object.values(state.directThreads || {}).find((thread) => isCoreDirectThread(thread) && !thread.topicKey && sameParticipants(thread.userIds, userIds));
}

export function draftDirectThreadForUsers(actorId: string, userIds: string[]): DirectThread | undefined {
  const targetUserIds = normalizeUserIds(userIds).filter((id) => id !== actorId);
  const participants = normalizeUserIds([actorId, ...targetUserIds]);
  if (participants.length < 2) return undefined;
  return {
    id: directThreadIdForUsers(participants) as ThreadId,
    protocol: CHAT_DIRECT_PROTOCOL,
    userIds: participants as MemberId[],
    topic: null,
    createdAt: 0,
    archivedAt: null
  };
}

export function forwardedMessageBody(message: Message, memberNamesById: Record<string, string>) {
  const name = (message.authorId ? memberNamesById[message.authorId] : undefined) || message.authorName || message.authorId || "Member";
  return `Forwarded from ${name}:\n${message.body}`;
}

export function channelFeed(state: ChatState, channelId?: string) {
  return {
    embeds: channelEmbeds(state, channelId),
    messages: channelMessages(state, channelId),
    threads: channelThreads(state, channelId)
  };
}

export function forwardTargetsForState(input: {
  activeChannelId?: string;
  activeThreadId?: string;
  activeView: "channel" | "dm" | "media";
  actorId: string;
  channels: Array<{ id: string; name: string }>;
  memberNamesById: Record<string, string>;
  state: ChatState;
}): MessageForwardTarget[] {
  const targets: MessageForwardTarget[] = [];
  for (const channel of input.channels) {
    if (input.activeView === "channel" && channel.id === input.activeChannelId) continue;
    targets.push({ id: `channel:${channel.id}`, type: "channel", label: `# ${channel.name}`, channelId: channel.id });
  }
  const seenThreads = new Set<string>();
  const memberIds = new Set<string>();
  for (const [key, member] of Object.entries(input.state.members || {})) {
    const id = member.memberId || member.id || key;
    if (id && id !== input.actorId && !member.revokedAt && !member.bannedAt) memberIds.add(id);
  }
  for (const [key, item] of Object.entries(input.state.presence || {})) {
    const id = item.memberId || key;
    if (id && id !== input.actorId) memberIds.add(id);
  }
  for (const memberId of memberIds) {
    const userIds = normalizeUserIds([input.actorId, memberId]);
    if (userIds.length < 2) continue;
    const threadId = directThreadIdForUsers(userIds);
    if (input.activeView === "dm" && threadId === input.activeThreadId) continue;
    if (seenThreads.has(threadId)) continue;
    seenThreads.add(threadId);
    targets.push({ id: `dm:${threadId}`, type: "dm", label: input.memberNamesById[memberId] || memberId, threadId, userIds });
  }
  return targets;
}
