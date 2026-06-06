import type { RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import type { ChordLiveClient } from "@entities/chat/model/useChordClient";
import type { ChatViewData } from "@entities/chat/model/useChatViewData";

export type ChatActionHandlersInput = {
  joinedMediaRoomId?: string;
  live: ChordLiveClient;
  localVoicePreferences: VoicePreferences;
  media: ChatMediaRooms;
  recentVoiceJoin?: RecentVoiceJoin;
  ui: ChatUiActions;
  view: ChatViewData;
};
