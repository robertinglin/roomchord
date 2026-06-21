import type { DirectThread } from "@entities/chat/model/types";

function visibleUserIds(thread: DirectThread, currentUserId?: string) {
  return (thread.userIds || []).filter((id) => id !== currentUserId);
}

function visibleUsers(thread: DirectThread, memberNamesById: Record<string, string>, currentUserId?: string) {
  return visibleUserIds(thread, currentUserId).map((id) => memberNamesById[id] || id);
}

export function threadTitle(thread: DirectThread, memberNamesById: Record<string, string> = {}, currentUserId?: string) {
  const users = visibleUsers(thread, memberNamesById, currentUserId);
  return users.join(", ") || thread.topicKey || thread.topic || "Direct message";
}

export function threadAvatar(thread: DirectThread, memberAvatarsById: Record<string, string>, currentUserId?: string) {
  const memberId = visibleUserIds(thread, currentUserId)[0];
  return memberId ? memberAvatarsById[memberId] : undefined;
}
