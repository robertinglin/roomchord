import type { MatterhornEphemeralToken } from "matterhorn-sdk/browser/liveRoomConnector";
import type { CallMediaSettings, CallMediaTrackInfo, ScreenPreviewSnapshot, SfuCallState } from "matterhorn-sdk/browser/types";
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
  voiceTokens: MatterhornEphemeralToken[];
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onStopWatchingScreenShare?: (participantId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  onWatchScreenShare?: (participantId: string) => void;
  showSidebarMenu?: boolean;
  onOpenMenu?: () => void;
  onLeaveVoiceRoom?: () => void;
  onToggleVoiceCameraSwap?: () => void;
  onToggleVoiceScreenShare?: () => void;
  voiceControlCanSwapCamera?: boolean;
  voiceControlShowScreenShare?: boolean;
  onToggleVoiceVideo?: () => void;
  voiceControlCanUseVideo?: boolean;
  voiceControlError?: string;
  voiceControlSfuActive?: boolean;
  voiceControlSfuStatus?: string;
  voiceControlShareActive?: boolean;
  voiceControlVideoOn?: boolean;
};
