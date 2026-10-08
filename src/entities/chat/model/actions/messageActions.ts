import { latestDirectMessageTime } from "@entities/chat/model/state";
import { parseMentionedMemberIds } from "@entities/chat/model/mentions";
import type { ChannelId, MemberId, Message, MessageId } from "@entities/chat/model/types";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import {
  directThreadForUsers,
  draftDirectThreadForUsers,
  hasDirectMessages,
  messageEmbeds
} from "@entities/chat/model/chatViewModel";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";
import type { MatterhornReshareForForwardResult } from "matterhorn-sdk/browser";

type ForwardMessageResult = false | true | string | MatterhornReshareForForwardResult;
type MessageDeleteResult = true | string;

const DELETE_OPERATION_TIMEOUT_MS = 15_000;

async function withDeleteTimeout<T>(operation: Promise<T>, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(message)), DELETE_OPERATION_TIMEOUT_MS); })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function hasMessageContent(body: string, attachmentIds: string[]) {
  return body.trim().length > 0 || attachmentIds.length > 0;
}

function rejectedForwardReason(result: unknown): string | false | undefined {
  if (!result || typeof result !== "object" || !("ok" in result)) return undefined;
  const forward = result as { ok: unknown; reason?: unknown };
  if (forward.ok === true) return undefined;
  return typeof forward.reason === "string" && forward.reason.trim() ? forward.reason : false;
}

export function messageActions(input: ChatActionHandlersInput) {
  const { live, ui, view } = input;
  const { dispatch, state } = live;

  // Notifications are now declarative: the app schema's `notifications` block
  // tells the SDK NotificationRuntime to push on accepted operations. We only
  // surface the data its audience expressions need. Mentions can only be
  // resolved client-side (member names live here), so we attach the resolved
  // recipient ids as `mentionIds`; the relay still never sees message content.
  async function sendChannelMessageToChannel(channelId: string, body: string, attachmentIds: string[] = [], tagIds: string[] = []) {
    if (view.actorChatDisabled || !hasMessageContent(body, attachmentIds)) return;
    const embeds = messageEmbeds(body);
    const mentionIds = parseMentionedMemberIds(body, view.memberNamesById);
    const normalizedTagIds = [...new Set(tagIds.map((tagId) => tagId.trim()).filter(Boolean))].slice(0, 32);
    const payload = { channelId: channelId as ChannelId, body, embeds, mentionIds: mentionIds as MemberId[], attachmentIds, ...(normalizedTagIds.length ? { tagIds: normalizedTagIds } : {}) };
    await dispatch("messageSend", payload);
    for (const embed of embeds) {
      if (embed.provider === "link") continue;
      await dispatch("embedAdd", { scopeType: "channel", scopeId: channelId, url: embed.url, title: embed.title, provider: embed.provider });
    }
  }

  async function sendChannelMessage(body: string, attachmentIds: string[] = [], tagIds: string[] = []) {
    if (!view.currentChannelId) return;
    await sendChannelMessageToChannel(view.currentChannelId, body, attachmentIds, tagIds);
  }

  async function sendDirectMessageToThread(threadId: string, userIds: string[], body: string, attachmentIds: string[] = []) {
    if (view.actorChatDisabled || !hasMessageContent(body, attachmentIds)) return;
    try {
      const payload = {
        userIds: userIds as MemberId[],
        ...(view.activeThread?.topicKey ? { topicKey: view.activeThread.topicKey } : {}),
        body,
        attachmentIds
      };
      await dispatch("directMessageSend", payload);
    } catch {
      return;
    }
    const committedThread = directThreadForUsers(live.state, userIds) || directThreadForUsers(state, userIds);
    if (committedThread) {
      ui.clearDraftDirectThread(committedThread.id);
      ui.showDirectThread(committedThread.id);
      ui.setActiveThreadId(committedThread.id);
      return;
    }
    ui.showDirectThread(threadId);
    ui.setActiveThreadId(threadId);
  }

  async function sendDirectMessage(body: string, attachmentIds: string[] = []) {
    if (!view.currentThreadId) return;
    const userIds = view.activeThread?.userIds;
    if (!userIds || userIds.length < 2) return;
    await sendDirectMessageToThread(view.currentThreadId, userIds, body, attachmentIds);
  }

  async function forwardMessage(message: Message, target: MessageForwardTarget): Promise<ForwardMessageResult> {
    const channelId = "channelId" in message ? message.channelId : undefined;
    const source = message.threadId
      ? { kind: "direct.thread" as const, scopeId: message.threadId, messageId: message.id }
      : channelId
        ? { kind: "channel" as const, scopeId: channelId, messageId: message.id }
        : undefined;
    if (!source) return false;
    const destination = target.type === "channel"
      ? { kind: "channel" as const, channelId: target.channelId }
      : {
          kind: "direct.thread" as const,
          ...(target.threadId ? { threadId: target.threadId } : {}),
          userIds: target.userIds,
          ...(target.topicKey ? { topicKey: target.topicKey } : {})
        };
    const sourceScope = { kind: source.kind, scopeId: source.scopeId };
    const targetScope = target.type === "channel"
      ? { kind: "channel" as const, scopeId: target.channelId }
      : { kind: "direct.thread" as const, scopeId: target.threadId };
    const hasAttachments = Boolean(message.attachmentIds?.length);
    const needsAttachmentReshare = hasAttachments
      && (sourceScope.kind !== targetScope.kind || sourceScope.scopeId !== targetScope.scopeId);
    try {
      if (needsAttachmentReshare) {
        const result = await live.reshareForForward({ source, target: destination });
        const rejection = rejectedForwardReason(result.forward);
        return rejection === undefined ? result : rejection;
      }
      const result = await live.forwardMessage({ source, target: destination });
      return rejectedForwardReason(result) ?? true;
    } catch (error) {
      // The authoritative host reports provider, abort, fanout, and cleanup
      // failures. There is intentionally no copied-text or local compensation fallback.
      if (error instanceof Error) return error.message;
      if (typeof error === "object" && error !== null && "message" in error) {
        return String((error as { message: unknown }).message);
      }
      return false;
    }
  }

  async function replyToMessage(replyToId: string, body: string, attachmentIds: string[] = [], tagIds: string[] = []) {
    if (!hasMessageContent(body, attachmentIds)) return;
    const directTarget = state.directMessages?.[replyToId as MessageId];
    if (directTarget?.threadId && directTarget.userIds?.length) {
      await dispatch("directMessageReply", {
        userIds: directTarget.userIds as MemberId[],
        topicKey: directTarget.topicKey || undefined,
        replyToId: replyToId as MessageId,
        body,
        attachmentIds
      });
      return;
    }
    if (!view.currentChannelId) return;
    if (view.actorChatDisabled) return;
    const mentionIds = parseMentionedMemberIds(body, view.memberNamesById);
    const normalizedTagIds = [...new Set(tagIds.map((tagId) => tagId.trim()).filter(Boolean))].slice(0, 32);
    await dispatch("messageReply", { channelId: view.currentChannelId as ChannelId, replyToId: replyToId as MessageId, body, mentionIds: mentionIds as MemberId[], attachmentIds, ...(normalizedTagIds.length ? { tagIds: normalizedTagIds } : {}) });
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (state.directMessages?.[messageId as MessageId]) {
      await dispatch("directMessageReact", { messageId: messageId as MessageId, emoji });
      return;
    }
    await dispatch("messageReact", { messageId: messageId as MessageId, emoji });
  }

  async function pinMessage(messageId: string) {
    if (state.directMessages?.[messageId as MessageId]) {
      await dispatch("directMessagePin", { messageId: messageId as MessageId });
      return;
    }
    await dispatch("messagePin", { messageId: messageId as MessageId });
  }

  async function unpinMessage(messageId: string) {
    if (state.directMessages?.[messageId as MessageId]) {
      await dispatch("directMessageUnpin", { messageId: messageId as MessageId });
      return;
    }
    await dispatch("messageUnpin", { messageId: messageId as MessageId });
  }

  async function deleteMessage(messageId: string): Promise<MessageDeleteResult> {
    const directMessage = state.directMessages?.[messageId as MessageId];
    const message = directMessage || state.messages?.[messageId as MessageId];
    const otherMessages = [
      ...Object.values(state.messages || {}),
      ...Object.values(state.directMessages || {})
    ].filter((candidate) => candidate.id !== messageId && !candidate.deletedAt);
    const exclusiveAttachmentIds = (message?.attachmentIds || []).filter((attachmentId) => (
      !otherMessages.some((candidate) => candidate.attachmentIds?.includes(attachmentId))
    ));

    try {
      const deletion = directMessage
        ? dispatch("directMessageDelete", { messageId: messageId as MessageId })
        : dispatch("messageDelete", { messageId: messageId as MessageId });
      await withDeleteTimeout(deletion, "Deletion was not confirmed because the connection stopped responding.");
    } catch {
      return "Deletion was not confirmed. The message and its attached files may still exist. Reconnect and retry.";
    }

    const files = Object.entries(state.files || {}) as Array<[string, { id?: string; fileId?: string; removedAt?: number | null }]>;
    const attachments = Object.entries(state.attachments || {}) as Array<[string, { id?: string; assetId?: string; removedAt?: number | null }]>;
    const cleanupResults = await Promise.all(exclusiveAttachmentIds.map(async (attachmentId) => {
      const file = files.find(([key, record]) => !record.removedAt && (key === attachmentId || record.id === attachmentId || record.fileId === attachmentId));
      const attachment = attachments.find(([key, record]) => !record.removedAt && (key === attachmentId || record.id === attachmentId || record.assetId === attachmentId));
      const cleanup = file
        ? dispatch("fileRemove", { fileId: file[1].fileId || attachmentId })
        : attachment
          ? dispatch("attachmentRemove", { attachmentId: attachment[1].id || attachment[0] })
          : undefined;
      if (!cleanup) return true;
      try {
        await withDeleteTimeout(cleanup, "Attachment cleanup stopped responding.");
        return true;
      } catch {
        return false;
      }
    }));
    const failedCleanupCount = cleanupResults.filter((result) => !result).length;
    if (failedCleanupCount > 0) {
      return `Message deletion was confirmed, but ${failedCleanupCount} attached ${failedCleanupCount === 1 ? "file was" : "files were"} not removed. Reconnect and retry file cleanup.`;
    }
    return true;
  }

  async function editMessage(messageId: string, body: string) {
    if (state.directMessages?.[messageId as MessageId]) {
      await dispatch("directMessageEdit", { messageId: messageId as MessageId, body, embeds: messageEmbeds(body) });
      return;
    }
    await dispatch("messageEdit", { messageId: messageId as MessageId, body, embeds: messageEmbeds(body) });
  }

  function closeDirectThread(threadId: string) {
    const nextThreads = view.threads.filter((thread) => thread.id !== threadId);
    ui.closeDirectThread({
      threadId,
      latestMessageAt: latestDirectMessageTime(state, threadId),
      nextThreadId: nextThreads[0]?.id
    });
  }

  async function openDirectThread(userIds: string[]) {
    console.error("[mosh] open direct thread", userIds, live.actor.memberId);
    const participants = Array.from(new Set([live.actor.memberId, ...userIds].filter(Boolean))).sort();
    if (participants.length < 2) return;
    const committedThread = directThreadForUsers(state, participants);
    if (committedThread) {
      ui.showDirectThread(committedThread.id);
      ui.setActiveThreadId(committedThread.id);
      ui.setActiveView("dm");
      ui.bumpComposerFocus();
      return;
    }
    let reservation: Awaited<ReturnType<typeof live.reserveDirectThread>>;
    try {
      reservation = await live.reserveDirectThread({ userIds: participants });
      console.error("[mosh] direct-thread reservation ready", reservation);
    } catch (error) {
      console.error("[mosh] direct-thread reservation failed", error);
      // Draft creation requires Matterhorn's canonical room-bound reservation;
      // never synthesize a local id when that primitive is unavailable.
      return;
    }
    const reservedDraft = draftDirectThreadForUsers(live.actor.memberId, reservation.userIds, reservation.threadId);
    if (!reservedDraft) return;
    ui.showDirectThread(reservedDraft.id);
    ui.openDraftDirectThread(reservedDraft);
  }

  function openDirectThreadForMember(memberId: string) {
    return openDirectThread([memberId]);
  }

  return {
    closeDirectThread,
    deleteMessage,
    editMessage,
    forwardMessage,
    openDirectThreadForMember,
    pinMessage,
    reactToMessage,
    replyToMessage,
    sendChannelMessage,
    sendDirectMessage,
    unpinMessage
  };
}
