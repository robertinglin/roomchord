import React, { createContext, useContext, type ReactNode } from "react";
import { chatActionHandlers, type ChatActionHandlers } from "@entities/chat/model/chatActions";
import { useChatMediaRooms, type ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import { useChatNotifications } from "@entities/chat/model/useChatNotifications";
import { useChatSyncEffects } from "@entities/chat/model/useChatSyncEffects";
import { useChatViewData, type ChatViewData } from "@entities/chat/model/useChatViewData";
import { useChordClient, type ChordLiveClient } from "@entities/chat/model/useChordClient";
import { useChatUiActions, useChatUiStore } from "@entities/chat/model/chatUiStore";

type ChatRuntime = {
  actions: ChatActionHandlers;
  live: ChordLiveClient;
  media: ChatMediaRooms;
  roomName: string;
  view: ChatViewData;
};

const ChatRuntimeContext = createContext<ChatRuntime | undefined>(undefined);

export function ChatRuntimeProvider({ children, live, roomName }: { children: ReactNode; live: ChordLiveClient; roomName: string }) {
  const state = live.state;
  const ui = useChatUiActions();
  const activeChannelId = useChatUiStore((value) => value.activeChannelId);
  const activeThreadId = useChatUiStore((value) => value.activeThreadId);
  const activeView = useChatUiStore((value) => value.activeView);
  const closedDirectThreads = useChatUiStore((value) => value.closedDirectThreads);
  const draftDirectThread = useChatUiStore((value) => value.draftDirectThread);
  const joinedMediaRoomId = useChatUiStore((value) => value.joinedMediaRoomId);
  const pendingScrollMessageId = useChatUiStore((value) => value.pendingScrollMessageId);
  const recentVoiceJoin = useChatUiStore((value) => value.recentVoiceJoin);
  const selectedMediaRoomId = useChatUiStore((value) => value.selectedMediaRoomId);
  const voicePreferences = useChatUiStore((value) => value.voicePreferences);
  const voiceSettingsOpen = useChatUiStore((value) => value.voiceSettingsOpen);
  const media = useChatMediaRooms({ live, roomName, voicePreferences });
  const view = useChatViewData({
    activeChannelId,
    activeThreadId,
    activeView,
    closedDirectThreads,
    draftDirectThread,
    joinedMediaRoomId,
    live,
    media,
    recentVoiceJoin,
    selectedMediaRoomId,
    voicePreferences,
    voiceSettingsOpen
  });
  const actions = chatActionHandlers({
    joinedMediaRoomId,
    live,
    localVoicePreferences: voicePreferences,
    media,
    recentVoiceJoin,
    ui,
    view
  });

  useChatNotifications({ actions, live, ui });

  useChatSyncEffects({
    live,
    channels: view.channels,
    currentChannelId: view.currentChannelId,
    currentThreadId: view.currentThreadId,
    draftDirectThread,
    feedMessages: view.feedMessages,
    joinedMediaRoomId,
    pendingScrollMessageId,
    recentVoiceJoin,
    showingDm: view.showingDm,
    state,
    threads: view.threads,
    ui
  });

  return (
    <ChatRuntimeContext.Provider value={{ actions, live, media, roomName, view }}>
      {children}
    </ChatRuntimeContext.Provider>
  );
}

export function useChatRuntime() {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime) throw new Error("useChatRuntime must be used inside ChatRuntimeProvider");
  return runtime;
}

export { useChordClient };
