import type { RoomKitEphemeralToken } from "roomkit-sdk/browser/liveRoomConnector";
import type { CallMediaSettings, CallMediaTrackInfo, ScreenPreviewSnapshot, SfuCallState } from "roomkit-sdk/browser/types";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import type { MediaRoom } from "@entities/chat/model/types";

export type VoiceParticipant = {
  avatar: string;
  id: string;
  isLocal?: boolean;
  memberId?: string;
  media?: CallMediaSettings;
  mediaTracks?: CallMediaTrackInfo[];
  name: string;
  screenPreview?: ScreenPreviewSnapshot;
  screenStream?: MediaStream;
  stream?: MediaStream;
};

export type VoiceRoomViewProps = {
  actorId: string;
  actorName: string;
  actorAvatar?: string;
  joinedRoomId?: string;
  localMedia?: CallMediaSettings;
  room: MediaRoom;
  sfu: SfuCallState;
  voicePreferences: VoicePreferences;
  voiceTokens: RoomKitEphemeralToken[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onStopWatchingScreenShare?: (participantId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  onWatchScreenShare?: (participantId: string) => void;
};
