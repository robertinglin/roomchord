import type { RecentVoiceJoin } from "../localVoiceReconnect";
import type { VoicePreferences } from "../localVoicePreferences";
import type { ChatUiActions } from "../chatUiStore";
import type { ChatMediaRooms } from "../useChatMediaRooms";
import type { ChordLiveClient } from "../useChordClient";
import type { ChatViewData } from "../useChatViewData";

export type ChatActionHandlersInput = {
  joinedMediaRoomId?: string;
  live: ChordLiveClient;
  localVoicePreferences: VoicePreferences;
  media: ChatMediaRooms;
  recentVoiceJoin?: RecentVoiceJoin;
  ui: ChatUiActions;
  view: ChatViewData;
};
