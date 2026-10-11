import type { MediaRoom } from "@entities/chat/model/types";
import type { ChatActionHandlersInput } from "@entities/chat/model/actions/types";
import {
  MEDIA_MODERATION_OPERATIONS,
  type MediaModerationController,
  type MediaModerationResult
} from "matterhorn-sdk/browser/mediaModeration";
import type { VoiceMemberModerationAction, VoiceModerationHandlers, VoiceStageAction } from "@entities/chat/model/voiceModeration";

const MEMBER_ACTIONS: Record<VoiceMemberModerationAction, keyof typeof MEDIA_MODERATION_OPERATIONS> = {
  mute: "mute",
  deafen: "deafen",
  kick: "kick",
  suppress: "suppress"
};

const STAGE_ACTIONS: Record<VoiceStageAction, keyof typeof MEDIA_MODERATION_OPERATIONS> = {
  open: "openStage",
  close: "closeStage",
  requestSpeaker: "requestToSpeak",
  approveSpeaker: "approveSpeaker",
  removeSpeaker: "removeSpeaker"
};

function projectedRoom(input: ChatActionHandlersInput, roomId: string): MediaRoom | undefined {
  return input.view.visibleRooms.find((room) => room.id === roomId);
}

function isCurrentRoom(input: ChatActionHandlersInput, roomId: string) {
  return input.view.selectedMediaRoom?.id === roomId || input.view.joinedRoomId === roomId;
}

function participantFor(room: MediaRoom, memberId: string) {
  if (!room.participants || Array.isArray(room.participants)) return undefined;
  return room.participants[memberId];
}

function controllerFor(input: ChatActionHandlersInput): MediaModerationController | undefined {
  const controller = input.live.media?.moderation;
  return controller && typeof controller.mute === "function" ? controller : undefined;
}

function canUseController(input: ChatActionHandlersInput) {
  const controller = controllerFor(input);
  const state = input.voiceModerationState;
  return Boolean(
    controller
    && input.live.media?.available
    && state
    && state.relayStatus === "connected"
    && !state.pending
    && !state.error
  );
}

function canMemberAction(input: ChatActionHandlersInput, roomId: string, memberId: string, action: VoiceMemberModerationAction) {
  const room = projectedRoom(input, roomId);
  if (!room || !isCurrentRoom(input, roomId) || memberId === input.live.actor.memberId || !canUseController(input)) return false;
  if (!participantFor(room, memberId)) return false;
  const controller = controllerFor(input);
  try {
    if (!controller?.policy(roomId, memberId).admit) return false;
  } catch {
    return false;
  }
  const operation = MEDIA_MODERATION_OPERATIONS[MEMBER_ACTIONS[action]];
  return Boolean(controller && input.live.can(operation));
}

function canStageAction(input: ChatActionHandlersInput, roomId: string, action: VoiceStageAction, memberId?: string) {
  const room = projectedRoom(input, roomId);
  if (!room || room.kind !== "stage" || !isCurrentRoom(input, roomId) || !canUseController(input)) return false;
  if (action === "requestSpeaker") {
    return memberId === input.live.actor.memberId
      && Boolean(participantFor(room, input.live.actor.memberId))
      && Boolean(room.stage?.open)
      && input.live.can(MEDIA_MODERATION_OPERATIONS[STAGE_ACTIONS[action]]);
  }
  if ((action === "approveSpeaker" || action === "removeSpeaker") && (!memberId || !participantFor(room, memberId))) return false;
  return input.live.can(MEDIA_MODERATION_OPERATIONS[STAGE_ACTIONS[action]]);
}

export function voiceModerationActions(input: ChatActionHandlersInput): VoiceModerationHandlers {
  const controller = controllerFor(input);
  const state = input.voiceModerationState;
  const relayStatus = state?.relayStatus || input.live.media?.getRelayStatus?.() || "closed";
  const unavailableReason = !controller
    ? "Voice moderation is unavailable in this Matterhorn room."
    : !input.live.media?.available
      ? "Voice moderation is unavailable until the Matterhorn media relay is ready."
      : state?.error
        ? "Voice moderation is paused until the current policy error is cleared."
        : state?.pending
          ? "Voice moderation is applying an earlier policy change."
          : relayStatus !== "connected"
            ? "Voice moderation is paused until the media relay reconnects."
            : "Voice moderation is unavailable until authoritative media policy is ready.";

  async function run(operation: () => Promise<MediaModerationResult>): Promise<boolean> {
    if (!controller || !canUseController(input)) return false;
    state?.begin();
    try {
      await operation();
      return true;
    } catch (error) {
      state?.reportError(error);
      return false;
    } finally {
      state?.end();
    }
  }

  async function memberAction(roomId: string, memberId: string, action: VoiceMemberModerationAction, enabled = true) {
    if (!canMemberAction(input, roomId, memberId, action)) return false;
    const method = controller?.[MEMBER_ACTIONS[action]];
    if (!method) return false;
    return run(() => method({ mediaRoomId: roomId, memberId, enabled }));
  }

  async function stageAction(roomId: string, action: VoiceStageAction, memberId?: string) {
    if (!canStageAction(input, roomId, action, memberId)) return false;
    if (!controller) return false;
    if (action === "requestSpeaker" || action === "open" || action === "close") {
      const method = action === "requestSpeaker" ? controller.requestToSpeak : action === "open" ? controller.openStage : controller.closeStage;
      return run(() => method({ mediaRoomId: roomId }));
    }
    if (!memberId || (action !== "approveSpeaker" && action !== "removeSpeaker")) return false;
    const method = action === "approveSpeaker" ? controller.approveSpeaker : controller.removeSpeaker;
    return run(() => method({ mediaRoomId: roomId, memberId }));
  }

  return {
    available: canUseController(input),
    ...(!canUseController(input) ? { unavailableReason } : {}),
    relayStatus,
    pending: state?.pending || false,
    lastResult: state?.lastResult,
    error: state?.error,
    clearError: state?.clearError || (() => undefined),
    canMemberAction: (roomId, memberId, action) => canMemberAction(input, roomId, memberId, action),
    canStageAction: (roomId, action, memberId) => canStageAction(input, roomId, action, memberId),
    memberAction,
    stageAction
  };
}
