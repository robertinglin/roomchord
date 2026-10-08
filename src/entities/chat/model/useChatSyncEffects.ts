import { useEffect } from "react";
import { markChannelRead, markReadTag } from "./channelRead";
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
    const memberId = input.live?.actor.memberId;
    const readTag = memberId ? state.members?.[memberId]?.readTags?.["channel:" + currentChannelId] : undefined;
    void markChannelRead(input.live, feedMessages, currentChannelId, readTag);
  }, [currentChannelId, feedMessages, showingDm, input.live, state.members]);

  useEffect(() => {
    if (!showingDm || !currentThreadId) return;
    const latest = latestDirectMessageTime(state, currentThreadId);
    ui.markDirectThreadRead(currentThreadId, latest);

    if (input.live) {
      const latestMessage = Object.values(state.directMessages || {})
        .filter((message) => message.threadId === currentThreadId && !message.deletedAt)
        .reduce((current, message) => {
          if (!current) return message;
          const currentAt = Number(current.createdAt || 0);
          const messageAt = Number(message.createdAt || 0);
          return messageAt > currentAt || messageAt === currentAt && String(message.id) > String(current.id) ? message : current;
        }, undefined as Message | undefined);
      if (latestMessage) {
        const topic = "direct.thread:" + currentThreadId;
        const readTag = state.members?.[input.live.actor.memberId]?.readTags?.[topic];
        void markReadTag(input.live, "direct.thread", currentThreadId, {
          createdAt: Number(latestMessage.createdAt || 0),
          operationId: String(latestMessage.id)
        }, readTag);
      }
    }
  }, [currentThreadId, showingDm, state, ui, input.live]);
}
