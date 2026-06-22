import { useEffect } from "react";
import { messageAnchorId, messageIdFromHash } from "@entities/chat/model/messageLinks";
import { VOICE_RECONNECT_WINDOW_MS, type RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import { latestDirectMessageTime } from "@entities/chat/model/state";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChordLiveClient } from "@entities/chat/model/useChordClient";
import type { ChatState, DirectThread, Message } from "@entities/chat/model/types";
import { currentHash, directThreadForUsers, hasDirectMessages, linkedMessageLocation } from "@entities/chat/model/chatViewModel";

export type ChatSyncEffectsInput = {
  live?: ChordLiveClient;
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
    void input.live?.notifications?.markRead(`channel:${currentChannelId}`, {
      createdAt: Number(latest.createdAt || 0),
      operationId: String(latest.id)
    }, { source: "route-visible" });
  }, [currentChannelId, feedMessages, showingDm, input.live]);

  useEffect(() => {
    if (!showingDm || !currentThreadId) return;
    const latest = latestDirectMessageTime(state, currentThreadId);
    ui.markDirectThreadRead(currentThreadId, latest);

    // Also mark Matterhorn notifications read for each sender in this thread.
    const notifications = input.live?.notifications;
    if (notifications) {
      const actorId = input.live?.actor.memberId;
      const messages = Object.values(state.directMessages || {})
        .filter((m) => m.threadId === currentThreadId && !m.deletedAt);
      const latestBySender = new Map<string, Message>();
      for (const message of messages) {
        if (!message.authorId) continue;
        if (message.authorId === actorId) continue;
        const existing = latestBySender.get(message.authorId);
        if (!existing || (message.createdAt || 0) > (existing.createdAt || 0)) {
          latestBySender.set(message.authorId, message);
        }
      }
      for (const [authorId, message] of latestBySender) {
        void notifications.markRead(`dm:${authorId}`, {
          createdAt: Number(message.createdAt || 0),
          operationId: String(message.id)
        });
      }
    }
  }, [currentThreadId, showingDm, state, ui, input.live]);
}
