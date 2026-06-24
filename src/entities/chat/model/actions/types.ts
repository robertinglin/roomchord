import type { RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import type { ChatViewData } from "@entities/chat/model/useChatViewData";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh} from "../../../../../types";

export type ChatActionHandlersInput = {
  joinedMediaRoomId?: string;
  live: MatterhornRoom<Mosh>;
  localVoicePreferences: VoicePreferences;
  media: ChatMediaRooms;
  recentVoiceJoin?: RecentVoiceJoin;
  ui: ChatUiActions;
  view: ChatViewData;
};
