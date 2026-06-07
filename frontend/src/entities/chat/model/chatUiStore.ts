import React, { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { CallMediaSettings } from "roomkit-sdk/browser/types";
import { clearRecentVoiceJoin, loadRecentVoiceJoin, saveRecentVoiceJoin, type RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import { loadClosedDirectThreads, saveClosedDirectThreads } from "@entities/chat/model/localClosedDirectThreads";
import { loadDirectReadState, saveDirectReadState } from "@entities/chat/model/localReadState";
import { loadVoicePreferences, saveVoicePreferences, type VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { DirectThread } from "@entities/chat/model/types";
import type { LinkedMessageLocation } from "@entities/chat/model/chatViewModel";
import type { ManagementTab } from "@entities/chat/model/managementTypes";

export type ActiveView = "channel" | "dm" | "media";
export type ManageDialogState = { tab?: ManagementTab; memberId?: string };

export type ChatStorageKeys = {
  closedDirectThreads: string;
  readAtByThread: string;
  voicePreferences: string;
  voiceReconnect: string;
};

type ChatUiValues = {
  activeChannelId?: string;
  activeThreadId?: string;
  activeView: ActiveView;
  closedDirectThreads: Record<string, number>;
  composerFocusKey: number;
  draftDirectThread?: DirectThread;
  joinedMediaRoomId?: string;
  localMediaSettings: CallMediaSettings;
  manageDialog?: ManageDialogState;
  mutedVoiceParticipantIds: Record<string, boolean>;
  pendingScrollMessageId?: string;
  readAtByThread: Record<string, number>;
  recentVoiceJoin?: RecentVoiceJoin;
  routedHash: string;
  selectedMediaRoomId?: string;
  storageKeys: ChatStorageKeys;
  sidebarOpen: boolean;
  voicePreferences: VoicePreferences;
  voiceSettingsOpen: boolean;
};

export type ChatUiActions = {
  archiveJoinedMediaRoom(roomId: string): void;
  closeSidebar(): void;
  bumpComposerFocus(): void;
  clearDraftDirectThread(threadId: string): void;
  clearRoutedHash(): void;
  closeDirectThread(input: { threadId: string; latestMessageAt: number; nextThreadId?: string }): void;
  closeManageDialog(): void;
  clearVoiceJoin(): void;
  dismissReconnect(): void;
  ensureActiveChannel(channelId?: string): void;
  ensureActiveThread(threadId?: string): void;
  leaveEmptyDmView(hasThreads: boolean): void;
  markDirectThreadRead(threadId: string, readAt: number): void;
  openDraftDirectThread(thread: DirectThread): void;
  openLinkedMessage(location: LinkedMessageLocation, hash: string): void;
  openManageDialog(tab?: ManagementTab, memberId?: string): void;
  rememberVoiceJoin(roomId: string, media: CallMediaSettings, joinedAt?: number): void;
  refreshRecentVoiceJoin(): void;
  selectChannel(channelId: string): void;
  selectDirectThread(threadId: string): void;
  selectMediaRoom(roomId: string): void;
  setActiveThreadId(threadId?: string): void;
  setActiveView(view: ActiveView): void;
  setJoinedMediaRoomId(roomId?: string): void;
  setLocalMediaSettings(media: CallMediaSettings): void;
  setPendingScrollMessageId(messageId?: string): void;
  setSelectedMediaRoomId(roomId?: string): void;
  setVoiceSettingsOpen(open: boolean): void;
  showDirectThread(threadId: string): void;
  setSidebarOpen(open: boolean): void;
  toggleVoiceParticipantMute(participantId: string): void;
  updateVoicePreferences(preferences: VoicePreferences): void;
};

export type ChatUiState = ChatUiValues & {
  actions: ChatUiActions;
};

export type ChatUiStore = StoreApi<ChatUiState>;

type ChatUiStoreInput = {
  initialLinkedLocation?: LinkedMessageLocation;
  storageKeys: ChatStorageKeys;
};

function defaultActiveView(location?: LinkedMessageLocation): ActiveView {
  return location?.view || "channel";
}

function createChatUiState(input: ChatUiStoreInput, actions: ChatUiActions): ChatUiState {
  return {
    activeChannelId: input.initialLinkedLocation?.view === "channel" ? input.initialLinkedLocation.channelId : undefined,
    activeThreadId: input.initialLinkedLocation?.view === "dm" ? input.initialLinkedLocation.threadId : undefined,
    activeView: defaultActiveView(input.initialLinkedLocation),
    actions,
    closedDirectThreads: loadClosedDirectThreads(input.storageKeys.closedDirectThreads),
    composerFocusKey: 0,
    joinedMediaRoomId: undefined,
    localMediaSettings: { audio: true, video: false },
    mutedVoiceParticipantIds: {},
    pendingScrollMessageId: input.initialLinkedLocation?.messageId,
    readAtByThread: loadDirectReadState(input.storageKeys.readAtByThread),
    recentVoiceJoin: loadRecentVoiceJoin(input.storageKeys.voiceReconnect),
    routedHash: input.initialLinkedLocation ? currentHash() : "",
    selectedMediaRoomId: undefined,
    storageKeys: input.storageKeys,
    sidebarOpen: false,
    voicePreferences: loadVoicePreferences(input.storageKeys.voicePreferences),
    voiceSettingsOpen: false
  };
}

function currentHash() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

export function createChatUiStore(input: ChatUiStoreInput): ChatUiStore {
  return createStore<ChatUiState>((set, get) => {
    const actions: ChatUiActions = {
      archiveJoinedMediaRoom(roomId) {
        set((state) => state.joinedMediaRoomId === roomId ? { joinedMediaRoomId: undefined } : {});
      },
      bumpComposerFocus() {
        set((state) => ({ composerFocusKey: state.composerFocusKey + 1 }));
      },
      clearDraftDirectThread(threadId) {
        set((state) => state.draftDirectThread?.id === threadId ? { draftDirectThread: undefined } : {});
      },
      clearRoutedHash() {
        set({ routedHash: "" });
      },
      closeDirectThread({ threadId, latestMessageAt, nextThreadId }) {
        set((state) => {
          const closedDirectThreads = { ...state.closedDirectThreads, [threadId]: latestMessageAt };
          saveClosedDirectThreads(state.storageKeys.closedDirectThreads, closedDirectThreads);
          return {
            activeThreadId: state.activeThreadId === threadId ? nextThreadId : state.activeThreadId,
            activeView: state.activeView === "dm" && state.activeThreadId === threadId && !nextThreadId ? "channel" : state.activeView,
            closedDirectThreads,
            draftDirectThread: state.draftDirectThread?.id === threadId ? undefined : state.draftDirectThread
          };
        });
      },
      closeManageDialog() {
        set({ manageDialog: undefined });
      },
      closeSidebar() {
        set({ sidebarOpen: false });
      },
      clearVoiceJoin() {
        set((state) => {
          clearRecentVoiceJoin(state.storageKeys.voiceReconnect);
          return { recentVoiceJoin: undefined };
        });
      },
      dismissReconnect() {
        actions.clearVoiceJoin();
      },
      ensureActiveChannel(channelId) {
        if (!channelId) return;
        set((state) => state.activeChannelId ? {} : { activeChannelId: channelId });
      },
      ensureActiveThread(threadId) {
        if (!threadId) return;
        set((state) => state.activeThreadId ? {} : { activeThreadId: threadId });
      },
      leaveEmptyDmView(hasThreads) {
        set((state) => state.activeView === "dm" && !hasThreads ? { activeView: "channel" } : {});
      },
      markDirectThreadRead(threadId, readAt) {
        set((state) => {
          if (readAt <= Number(state.readAtByThread[threadId] || 0)) return {};
          const readAtByThread = { ...state.readAtByThread, [threadId]: readAt };
          saveDirectReadState(state.storageKeys.readAtByThread, readAtByThread);
          return { readAtByThread };
        });
      },
      openDraftDirectThread(thread) {
        actions.showDirectThread(thread.id);
        set((state) => ({
          activeThreadId: thread.id,
          activeView: "dm",
          composerFocusKey: state.composerFocusKey + 1,
          draftDirectThread: thread
        }));
      },
      openLinkedMessage(location, hash) {
        set((state) => {
          if (state.routedHash === hash) return {};
          const next: Partial<ChatUiValues> = {
            pendingScrollMessageId: location.messageId,
            routedHash: hash
          };
          if (location.view === "channel") {
            next.activeChannelId = location.channelId;
            next.activeView = "channel";
            return next;
          }
          const closedDirectThreads = { ...state.closedDirectThreads };
          delete closedDirectThreads[location.threadId];
          saveClosedDirectThreads(state.storageKeys.closedDirectThreads, closedDirectThreads);
          next.activeThreadId = location.threadId;
          next.activeView = "dm";
          next.closedDirectThreads = closedDirectThreads;
          return next;
        });
      },
      openManageDialog(tab = "overview", memberId) {
        set({ manageDialog: { tab, memberId } });
      },
      rememberVoiceJoin(roomId, media, joinedAt = Date.now()) {
        set((state) => {
          const recentVoiceJoin = { roomId, media, joinedAt };
          saveRecentVoiceJoin(state.storageKeys.voiceReconnect, roomId, media, joinedAt);
          return { recentVoiceJoin };
        });
      },
      refreshRecentVoiceJoin() {
        set((state) => ({ recentVoiceJoin: loadRecentVoiceJoin(state.storageKeys.voiceReconnect) }));
      },
      selectChannel(channelId) {
        set({ activeChannelId: channelId, activeView: "channel" });
      },
      selectDirectThread(threadId) {
        actions.showDirectThread(threadId);
        set({ activeThreadId: threadId, activeView: "dm" });
      },
      selectMediaRoom(roomId) {
        set({ activeView: "media", selectedMediaRoomId: roomId });
      },
      setActiveThreadId(threadId) {
        set({ activeThreadId: threadId });
      },
      setSidebarOpen(open) {
        set({ sidebarOpen: open });
      },
      setActiveView(view) {
        set({ activeView: view });
      },
      setJoinedMediaRoomId(roomId) {
        set({ joinedMediaRoomId: roomId });
      },
      setLocalMediaSettings(media) {
        set({ localMediaSettings: media });
      },
      setPendingScrollMessageId(messageId) {
        set({ pendingScrollMessageId: messageId });
      },
      setSelectedMediaRoomId(roomId) {
        set({ selectedMediaRoomId: roomId });
      },
      setVoiceSettingsOpen(open) {
        set({ voiceSettingsOpen: open });
      },
      showDirectThread(threadId) {
        set((state) => {
          if (!(threadId in state.closedDirectThreads)) return {};
          const closedDirectThreads = { ...state.closedDirectThreads };
          delete closedDirectThreads[threadId];
          saveClosedDirectThreads(state.storageKeys.closedDirectThreads, closedDirectThreads);
          return { closedDirectThreads };
        });
      },
      toggleVoiceParticipantMute(participantId) {
        set((state) => ({
          mutedVoiceParticipantIds: {
            ...state.mutedVoiceParticipantIds,
            [participantId]: !state.mutedVoiceParticipantIds[participantId]
          }
        }));
      },
      updateVoicePreferences(preferences) {
        set((state) => {
          saveVoicePreferences(state.storageKeys.voicePreferences, preferences);
          return { voicePreferences: preferences };
        });
      }
    };
    return createChatUiState(input, actions);
  });
}

const ChatUiStoreContext = createContext<ChatUiStore | undefined>(undefined);

export function ChatUiStoreProvider({
  children,
  initialLinkedLocation,
  storageKeys
}: {
  children: ReactNode;
  initialLinkedLocation?: LinkedMessageLocation;
  storageKeys: ChatStorageKeys;
}) {
  const store = useRef<ChatUiStore>();
  if (!store.current) store.current = createChatUiStore({ initialLinkedLocation, storageKeys });
  return React.createElement(ChatUiStoreContext.Provider, { value: store.current }, children);
}

export function useChatUiStore<T>(selector: (state: ChatUiState) => T): T {
  const store = useContext(ChatUiStoreContext);
  if (!store) throw new Error("useChatUiStore must be used inside ChatUiStoreProvider");
  return useStore(store, selector);
}

export function useChatUiActions() {
  return useChatUiStore((state) => state.actions);
}
