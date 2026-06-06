import type { RoomKitLiveHost } from "roomkit-sdk/browser/liveRoomConnector";
import type { ChatState } from "@entities/chat/model/types";

declare global {
  interface Window {
    ROOMKIT_BACKEND_URL?: string;
    ROOMKIT_EXAMPLE_BACKEND_URL?: string;
    ROOMKIT_CHORD_HOST?: RoomKitLiveHost<ChatState>;
    ROOMKIT_HOST?: RoomKitLiveHost<ChatState>;
    ROOMKIT_EXAMPLE_HOST?: RoomKitLiveHost<ChatState>;
    ROOMKIT_CHAT_HOST?: RoomKitLiveHost<ChatState>;
  }
}

export {};
