import { latestDirectMessageTime } from "@entities/chat/model/state";
import { parseMentionedMemberIds } from "@entities/chat/model/mentions";
import type { ChannelId, MemberId, Message, MessageId } from "@entities/chat/model/types";
import type { MessageForwardTarget } from "@entities/chat/model/messageForwardingTypes";
import {
  directThreadForUsers,
  draftDirectThreadForUsers,
  forwardedMessageBody,
  hasDirectMessages,
  messageEmbeds
} from "@entities/chat/model/chatViewModel";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";

export function messageActions(input: ChatActionHandlersInput) {
  const { live, ui, view } = input;
  const { dispatch, state } = live;

  // Notifications are now declarative: the app schema's `notifications` block
  // tells the SDK NotificationRuntime to push on accepted operations. We only
  // surface the data its audience expressions need. Mentions can only be
  // resolved client-side (member names live here), so we attach the resolved
  // recipient ids as `mentionIds`; the relay still never sees message content.
  async function sendChannelMessageToChannel(channelId: string, body: string) {
    const embeds = messageEmbeds(body);
    const mentionIds = parseMentionedMemberIds(body, view.memberNamesById);
    await dispatch("messageSend", { channelId: channelId as ChannelId, body, embeds, mentionIds: mentionIds as MemberId[] });
    for (const embed of embeds) {
      if (embed.provider === "link") continue;
      await dispatch("embedAdd", { scopeType: "channel", scopeId: channelId, url: embed.url, title: embed.title, provider: embed.provider });
    }
  }

  async function sendChannelMessage(body: string) {
    if (!view.currentChannelId) return;
    await sendChannelMessageToChannel(view.currentChannelId, body);
  }

  async function sendDirectMessageToThread(threadId: string, userIds: string[], body: string) {
    const result = await dispatch("directMessageSend", { userIds: userIds as MemberId[], body });
    if (result.ok === false) return;
    const committedThread = result.state ? directThreadForUsers(result.state, userIds) : directThreadForUsers(state, userIds);
    if (committedThread) {
      ui.clearDraftDirectThread(committedThread.id);
      ui.showDirectThread(committedThread.id);
      ui.setActiveThreadId(committedThread.id);
      return;
    }
    ui.showDirectThread(threadId);
    ui.setActiveThreadId(threadId);
  }

  async function sendDirectMessage(body: string) {
    if (!view.currentThreadId) return;
    const userIds = view.activeThread?.userIds;
    if (!userIds || userIds.length < 2) return;
    await sendDirectMessageToThread(view.currentThreadId, userIds, body);
  }

  async function forwardMessage(message: Message, target: MessageForwardTarget) {
    const body = forwardedMessageBody(message, view.memberNamesById);
    if (target.type === "channel") {
      await sendChannelMessageToChannel(target.channelId, body);
      return;
    }
    await sendDirectMessageToThread(target.threadId, target.userIds, body);
  }

  async function replyToMessage(replyToId: string, body: string) {
    if (!view.currentChannelId) return;
    const mentionIds = parseMentionedMemberIds(body, view.memberNamesById);
    await dispatch("messageReply", { channelId: view.currentChannelId as ChannelId, replyToId: replyToId as MessageId, body, mentionIds: mentionIds as MemberId[] });
  }

  async function reactToMessage(messageId: string, emoji: string) {
    await dispatch("messageReact", { messageId: messageId as MessageId, emoji });
  }

  async function pinMessage(messageId: string) {
    await dispatch("messagePin", { messageId: messageId as MessageId });
  }

  async function unpinMessage(messageId: string) {
    await dispatch("messageUnpin", { messageId: messageId as MessageId });
  }

  async function deleteMessage(messageId: string) {
    await dispatch("messageDelete", { messageId: messageId as MessageId });
  }

  async function editMessage(messageId: string, body: string) {
    await dispatch("messageEdit", { messageId: messageId as MessageId, body, embeds: messageEmbeds(body) });
  }

  function closeDirectThread(threadId: string) {
    const closingThread = view.threads.find((thread) => thread.id === threadId);
    const nextThreads = view.threads.filter((thread) => thread.id !== threadId);
    ui.closeDirectThread({
      threadId,
      latestMessageAt: latestDirectMessageTime(state, threadId),
      nextThreadId: nextThreads[0]?.id
    });
    if (closingThread?.userIds) {
      const draftThread = draftDirectThreadForUsers(live.actor.memberId, closingThread.userIds);
      if (draftThread) ui.closeDirectThread({ threadId: draftThread.id, latestMessageAt: latestDirectMessageTime(state, draftThread.id), nextThreadId: nextThreads[0]?.id });
    }
  }

  async function openDirectThread(userIds: string[]) {
    const draftThread = draftDirectThreadForUsers(live.actor.memberId, userIds);
    if (!draftThread?.userIds) return;
    ui.showDirectThread(draftThread.id);
    const committedThread = directThreadForUsers(state, draftThread.userIds);
    if (committedThread) {
      ui.showDirectThread(committedThread.id);
      ui.setActiveThreadId(committedThread.id);
      ui.setActiveView("dm");
      ui.bumpComposerFocus();
      return;
    }
    ui.openDraftDirectThread(draftThread);
  }

  function openDirectThreadForMember(memberId: string) {
    void openDirectThread([memberId]);
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
