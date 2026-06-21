import React from "react";
import type { ChatProps } from "@entities/chat/model/types";
import { ChatLoading } from "@shared/ui/ChatLoading";
import { ChatShell } from "@widgets/chat-shell/ui/ChatShell";
import { ChatRuntimeProvider } from "@entities/chat/model/chatRuntime";
import { ChatUiStoreProvider, type ChatStorageKeys } from "@entities/chat/model/chatUiStore";
import { closedDirectThreadsStorageKey } from "@entities/chat/model/localClosedDirectThreads";
import { directReadStorageKey } from "@entities/chat/model/localReadState";
import { voiceReconnectStorageKey } from "@entities/chat/model/localVoiceReconnect";
import { voicePreferencesStorageKey } from "@entities/chat/model/localVoicePreferences";
import { messageIdFromHash } from "@entities/chat/model/messageLinks";
import { currentHash, linkedMessageLocation } from "@entities/chat/model/chatViewModel";
import { useChordClient } from "@entities/chat/model/useChordClient";

export function ChatApp(props: ChatProps) {
  const live = useChordClient(props);
  if (!live.ready) {
    return (
      <ChatLoading
        roomName={live.envelope.room?.name || live.envelope.room?.id || "mosh"}
        message={live.message}
        status={live.status}
      />
    );
  }

  const roomName = live.envelope.room?.id || live.envelope.room?.name || "mosh";
  const launchHome = props.launchHome || props.home;
  const openLaunchHomeRoom = props.onOpenLaunchHomeRoom || props.openRoom;
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
      <ChatRuntimeProvider live={live} roomName={roomName}>
        <ChatShell launchHome={launchHome} onOpenLaunchHomeRoom={openLaunchHomeRoom} />
      </ChatRuntimeProvider>
    </ChatUiStoreProvider>
  );
}
