import type { RecentVoiceJoin } from "@entities/chat/model/localVoiceReconnect";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { ChatUiActions } from "@entities/chat/model/chatUiStore";
import type { ChatDirectCalls } from "@entities/chat/model/useChatDirectCalls";
import type { ChatMediaRooms } from "@entities/chat/model/useChatMediaRooms";
import type { ChatViewData } from "@entities/chat/model/useChatViewData";
import type { CallMediaSettings } from "matterhorn-sdk/browser/types";
import type { MatterhornRoom } from "matterhorn-sdk/client";
import type { Mosh} from "../../../../../types";
import type { VoiceModerationState } from "@entities/chat/model/voiceModeration";

export type ChatActionHandlersInput = {
  directCalls: ChatDirectCalls;
  heldDirectCallRoomId?: string;
  heldMediaRoomIds: Record<string, boolean>;
  joinedMediaRoomId?: string;
  live: MatterhornRoom<Mosh>;
  localMediaSettings: CallMediaSettings;
  localVoicePreferences: VoicePreferences;
  media: ChatMediaRooms;
  recentVoiceJoin?: RecentVoiceJoin;
  requestCallSwitch?: (input: CallSwitchPromptInput) => Promise<CallSwitchDecision>;
  ui: ChatUiActions;
  view: ChatViewData;
  voiceModerationState?: VoiceModerationState;
};

export type CallSwitchDecision = "hold" | "end" | "cancel";

export type CallSwitchPromptInput = {
  currentLabel: string;
  targetLabel: string;
};
