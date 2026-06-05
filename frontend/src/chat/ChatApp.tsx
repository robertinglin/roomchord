import React from "react";
import type { ChatProps } from "./types";
import { ChatContent } from "./components/ChatContent";
import { ChatLoading } from "./components/ChatLoading";
import { ChatManageDialog } from "./components/ChatManageDialog";
import { ChatPresenceRail } from "./components/ChatPresenceRail";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatRuntimeProvider } from "./chatRuntime";
import { ChatUiStoreProvider, type ChatStorageKeys } from "./chatUiStore";
import { closedDirectThreadsStorageKey } from "./localClosedDirectThreads";
import { directReadStorageKey } from "./localReadState";
import { voiceReconnectStorageKey } from "./localVoiceReconnect";
import { voicePreferencesStorageKey } from "./localVoicePreferences";
import { messageIdFromHash } from "./messageLinks";
import { currentHash, linkedMessageLocation } from "./chatViewModel";
import { useChordClient, type ChordLiveClient } from "./useChordClient";

export function ChatApp(props: ChatProps) {
  const live = useChordClient(props);
  if (!live.ready) {
    return (
      <ChatLoading
        roomName={live.envelope.room?.name || live.envelope.room?.id || "roomkit-chord"}
        message={live.message}
        status={live.status}
      />
    );
  }

  const roomName = live.envelope.room?.id || live.envelope.room?.name || "roomkit-chord";
  const storageKeys: ChatStorageKeys = {
    closedDirectThreads: closedDirectThreadsStorageKey(roomName, live.actor.memberId),
    readAtByThread: directReadStorageKey(roomName, live.actor.memberId),
    voicePreferences: voicePreferencesStorageKey(roomName, live.actor.memberId),
    voiceReconnect: voiceReconnectStorageKey(roomName, live.actor.memberId)
  };
  const initialLinkedLocation = linkedMessageLocation(live.state, currentHash(), messageIdFromHash);

  return (
    <ChatUiStoreProvider
      key={`${roomName}:${live.actor.memberId}`}
      initialLinkedLocation={initialLinkedLocation}
      storageKeys={storageKeys}
    >
      <ReadyChatApp live={live} roomName={roomName} />
    </ChatUiStoreProvider>
  );
}

function ReadyChatApp({ live, roomName }: { live: ChordLiveClient; roomName: string }) {
  return (
    <ChatRuntimeProvider live={live} roomName={roomName}>
      <main className="chat-shell">
        <ChatSidebar />
        <ChatContent />
        <ChatManageDialog />
        <ChatPresenceRail />
      </main>
    </ChatRuntimeProvider>
  );
}
