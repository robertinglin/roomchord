import { useEffect, useState } from "react";
import type {
  MatterhornMediaModerationController,
  MatterhornMediaModerationResult
} from "matterhorn-sdk/browser/mediaModeration";
import type { RelaySessionStatus } from "matterhorn-sdk/launcher/types";
import type { MatterhornMedia } from "matterhorn-sdk/client";

export type VoiceMemberModerationAction = "mute" | "deafen" | "kick" | "suppress";

export type VoiceStageAction = "open" | "close" | "requestSpeaker" | "approveSpeaker" | "removeSpeaker";

export type VoiceModerationState = {
  relayStatus: RelaySessionStatus;
  pending: boolean;
  lastResult?: MatterhornMediaModerationResult;
  error?: string;
  begin: () => void;
  end: () => void;
  reportError: (error: unknown) => void;
  clearError: () => void;
};

export type VoiceModerationHandlers = {
  available: boolean;
  unavailableReason?: string;
  relayStatus: RelaySessionStatus;
  pending: boolean;
  lastResult?: MatterhornMediaModerationResult;
  error?: string;
  clearError: () => void;
  canMemberAction: (roomId: string, memberId: string, action: VoiceMemberModerationAction) => boolean;
  canStageAction: (roomId: string, action: VoiceStageAction, memberId?: string) => boolean;
  memberAction: (roomId: string, memberId: string, action: VoiceMemberModerationAction, enabled?: boolean) => Promise<boolean>;
  stageAction: (roomId: string, action: VoiceStageAction, memberId?: string) => Promise<boolean>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Voice moderation failed.");
}

export function useVoiceModerationState(media: MatterhornMedia): VoiceModerationState | undefined {
  const [state, setState] = useState<Pick<VoiceModerationState, "relayStatus" | "pending" | "lastResult" | "error"> | undefined>(() => {
    const controller = media?.moderation as MatterhornMediaModerationController | undefined;
    if (!controller) return undefined;
    return {
      relayStatus: media.getRelayStatus?.() || "closed",
      pending: false
    };
  });

  useEffect(() => {
    const controller = media?.moderation as MatterhornMediaModerationController | undefined;
    if (!controller) {
      setState(undefined);
      return undefined;
    }
    let active = true;
    const update = (value: Partial<Pick<VoiceModerationState, "relayStatus" | "lastResult" | "error">>) => {
      if (!active) return;
      setState((current) => ({
        relayStatus: current?.relayStatus || media.getRelayStatus?.() || "closed",
        pending: current?.pending || false,
        ...value
      }));
    };
    let unsubscribeModeration: (() => void) | undefined;
    let unsubscribeRelay: (() => void) | undefined;
    try {
      unsubscribeModeration = controller.subscribe((result) => update({ lastResult: result, error: undefined }));
      unsubscribeRelay = media.subscribeRelayStatus?.((relayStatus) => update({ relayStatus }));
    } catch (error) {
      update({ error: errorMessage(error) });
    }
    return () => {
      active = false;
      unsubscribeModeration?.();
      unsubscribeRelay?.();
      try {
        controller.close();
      } catch {
        // Controller cleanup is best-effort during room teardown.
      }
    };
  }, [media]);

  if (!state) return undefined;
  return {
    ...state,
    begin: () => setState((current) => current ? { ...current, pending: true, error: undefined } : current),
    end: () => setState((current) => current ? { ...current, pending: false } : current),
    reportError: (error) => setState((current) => current ? { ...current, pending: false, error: errorMessage(error) } : current),
    clearError: () => setState((current) => current ? { ...current, error: undefined } : current)
  };
}
