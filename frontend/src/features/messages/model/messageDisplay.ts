import { messageAnchorId } from "@entities/chat/model/messageLinks";
import type { Message } from "@entities/chat/model/types";

export function authorName(message: Message, memberNamesById: Record<string, string>) {
  return message.authorName || (message.authorId ? memberNamesById[message.authorId] : undefined) || message.authorId || "Member";
}

export function messageAvatar(message: Message, memberAvatarsById: Record<string, string>) {
  return message.authorImageUrl || message.authorAvatarUrl || message.authorAvatar || (message.authorId ? memberAvatarsById[message.authorId] : undefined);
}

export function formatMessageTime(value?: number) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function previewText(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) return "Message has no text";
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

export function focusMessage(messageId: string) {
  window.requestAnimationFrame(() => {
    const target = document.getElementById(messageAnchorId(messageId));
    target?.scrollIntoView?.({ block: "center" });
    target?.focus({ preventScroll: true });
  });
}
