import { useEffect } from "react";
import { channelReadTopic, directThreadReadTopic } from "matterhorn-sdk/browser";
import { messageAnchorId, messageIdFromHash } from "@entities/chat/model/messageLinks";
import { VOICE_RECONNECT_WINDOW_MS, type RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import { latestDirectMessageTime } from "@entities/chat/model/state";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChatState, DirectThread, Message } from "@entities/chat/model/types";
import { currentHash, directThreadForUsers, hasDirectMessages, linkedMessageLocation } from "@entities/chat/model/chatViewModel";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh} from "../../../../types";

export type ChatSyncEffectsInput = {
  live?: MatterhornRoom<Mosh>;
  channels: Array<{ id: string }>;
  currentChannelId?: string;
  currentThreadId?: string;
  draftDirectThread?: DirectThread;
  feedMessages: Message[];
  joinedMediaRoomId?: string;
  pendingScrollMessageId?: string;
  recentVoiceJoin?: RecentVoiceJoin;
  showingDm: boolean;
  state: ChatState;
  threads: DirectThread[];
  ui: ChatUiActions;
};

export function useChatSyncEffects(input: ChatSyncEffectsInput) {
  const {
    channels,
    currentChannelId,
    currentThreadId,
    draftDirectThread,
    feedMessages,
    joinedMediaRoomId,
    pendingScrollMessageId,
    recentVoiceJoin,
    showingDm,
    state,
    threads,
    ui
  } = input;

  useEffect(() => {
    ui.ensureActiveChannel(channels[0]?.id);
  }, [channels, ui]);

  useEffect(() => {
    ui.ensureActiveThread(threads[0]?.id);
  }, [threads, ui]);

  useEffect(() => {
    ui.leaveEmptyDmView(threads.length > 0);
  }, [threads.length, ui]);

  useEffect(() => {
    if (!draftDirectThread) return;
    const realThread = directThreadForUsers(state, draftDirectThread.userIds);
    if (realThread) {
      ui.clearDraftDirectThread(draftDirectThread.id);
      if (currentThreadId === draftDirectThread.id) {
        ui.setActiveThreadId(realThread.id);
      }
      return;
    }
    if (hasDirectMessages(state, draftDirectThread.id)) ui.clearDraftDirectThread(draftDirectThread.id);
  }, [draftDirectThread, state, ui, currentThreadId]);

  useEffect(() => {
    function openLinkedMessage(hash = currentHash()) {
      if (!messageIdFromHash(hash)) {
        ui.clearRoutedHash();
        return;
      }
      const location = linkedMessageLocation(state, hash, messageIdFromHash);
      if (!location) return;
      ui.openLinkedMessage(location, hash);
    }

    const onHashChange = () => openLinkedMessage();
    openLinkedMessage();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [state.directMessages, state.messages, ui]);

  useEffect(() => {
    if (!pendingScrollMessageId || !feedMessages.some((message) => message.id === pendingScrollMessageId)) return;
    window.requestAnimationFrame(() => {
      const target = document.getElementById(messageAnchorId(pendingScrollMessageId));
      target?.scrollIntoView?.({ block: "center" });
      target?.focus({ preventScroll: true });
      ui.setPendingScrollMessageId(undefined);
    });
  }, [feedMessages, pendingScrollMessageId, ui]);

  useEffect(() => {
    if (!recentVoiceJoin) return undefined;
    const remaining = Math.max(0, VOICE_RECONNECT_WINDOW_MS - (Date.now() - recentVoiceJoin.joinedAt));
    const timer = window.setTimeout(() => {
      ui.refreshRecentVoiceJoin();
    }, remaining + 10);
    return () => window.clearTimeout(timer);
  }, [recentVoiceJoin, ui]);

  useEffect(() => {
    if (joinedMediaRoomId && state.rooms.some((room) => room.id === joinedMediaRoomId && room.archivedAt)) ui.archiveJoinedMediaRoom(joinedMediaRoomId);
  }, [joinedMediaRoomId, state.rooms, ui]);

  useEffect(() => {
    if (showingDm || !currentChannelId) return;
    const latest = feedMessages
      .filter((message) => !message.deletedAt)
      .reduce((current, message) => Number(message.createdAt || 0) > Number(current?.createdAt || 0) ? message : current, undefined as Message | undefined);
    if (!latest) return;
    void input.live?.notifications?.markRead(channelReadTopic(currentChannelId), {
      createdAt: Number(latest.createdAt || 0),
      operationId: String(latest.id)
    }, { source: "route-visible" });
  }, [currentChannelId, feedMessages, showingDm, input.live]);

  useEffect(() => {
    if (!showingDm || !currentThreadId) return;
    const latest = latestDirectMessageTime(state, currentThreadId);
    ui.markDirectThreadRead(currentThreadId, latest);

    const notifications = input.live?.notifications;
    if (notifications) {
      const latestMessage = Object.values(state.directMessages || {})
        .filter((message) => message.threadId === currentThreadId && !message.deletedAt)
        .reduce((current, message) => Number(message.createdAt || 0) > Number(current?.createdAt || 0) ? message : current, undefined as Message | undefined);
      console.info("[mosh.read-cursors] dm route-visible decision", {
        threadId: currentThreadId,
        messageCount: Object.values(state.directMessages || {}).filter((message) => message.threadId === currentThreadId && !message.deletedAt).length,
        latestMessageId: latestMessage?.id,
        latestMessageCreatedAt: latestMessage?.createdAt,
        hasNotifications: true
      });
      if (latestMessage) {
        void notifications.markRead(directThreadReadTopic(currentThreadId), {
          createdAt: Number(latestMessage.createdAt || 0),
          operationId: String(latestMessage.id)
        }, { source: "route-visible" });
      }
    } else {
      console.info("[mosh.read-cursors] dm route-visible decision", {
        threadId: currentThreadId,
        hasNotifications: false
      });
    }
  }, [currentThreadId, showingDm, state, ui, input.live]);
}
