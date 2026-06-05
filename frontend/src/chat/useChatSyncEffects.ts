import { useEffect } from "react";
import { messageAnchorId, messageIdFromHash } from "./messageLinks";
import { VOICE_RECONNECT_WINDOW_MS, type RecentVoiceJoin } from "./localVoiceReconnect";
import { latestDirectMessageTime } from "./state";
import type { ChatUiActions } from "./chatUiStore";
import type { ChatState, DirectThread, Message } from "./types";
import { currentHash, hasDirectMessages, linkedMessageLocation } from "./chatViewModel";

export type ChatSyncEffectsInput = {
  channels: Array<{ id: string }>;
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
    if (draftDirectThread && hasDirectMessages(state, draftDirectThread.id)) ui.clearDraftDirectThread(draftDirectThread.id);
  }, [draftDirectThread, state, ui]);

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
    if (!showingDm || !currentThreadId) return;
    const latest = latestDirectMessageTime(state, currentThreadId);
    ui.markDirectThreadRead(currentThreadId, latest);
  }, [currentThreadId, showingDm, state, ui]);
}
