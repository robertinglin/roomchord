import React, { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { RemoteAudioSink } from "@features/voice-room/ui/RemoteAudioSink";
import { VoiceParticipantGrid } from "@features/voice-room/ui/VoiceParticipantGrid";
import { VoiceScreenShares, type ActiveScreenShare } from "@features/voice-room/ui/VoiceScreenShares";
import type { VoiceRoomViewProps } from "@features/voice-room/model/types";
import { audioOn, isVoiceParticipantMuted, roomParticipants, screenOn, screenShareStream, streamHasTrack } from "@features/voice-room/model/voiceParticipants";
import { VoiceControlPanel } from "@shared/ui/VoiceControlPanel";
import { Button, MenuGlyph, MicGlyph } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

export type { VoiceRoomViewProps };

function moderationOperationLabel(operationType?: string): string | undefined {
  if (!operationType) return undefined;
  const labels: Record<string, string> = {
    "media.room.member.mute": "Member mute applied",
    "media.room.member.deafen": "Member deafen applied",
    "media.room.member.kick": "Member removed from voice",
    "media.room.member.suppress": "Speaker suppression applied",
    "media.stage.open": "Stage opened",
    "media.stage.close": "Stage closed",
    "media.stage.speaker.request": "Speaker request sent",
    "media.stage.speaker.approve": "Speaker approved",
    "media.stage.speaker.remove": "Speaker removed"
  };
  return labels[operationType] || "Voice moderation applied";
}

const styles = stylex.create({
  stage: {
    position: "relative",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: tokens.bg,
  },
  head: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: "0 0 auto",
    padding: "13px 16px",
    borderBottom: "1px solid oklch(0.11 0.006 250 / 0.72)",
  },
  mobileToggle: {
    display: "none",
    "@media (max-width: 760px)": { display: "inline-grid" },
  },
  icon: { color: tokens.success, flex: "0 0 auto", display: "inline-flex" },
  title: { margin: 0, fontFamily: tokens.fontDisplay, fontSize: "16px", fontWeight: 700 },
  subtitle: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.quiet,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  body: { minHeight: 0, flex: 1, overflow: "hidden" },
  layout: { minHeight: "100%", display: "flex", flexDirection: "column" },
  controls: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: tokens.surface,
  },
  stageControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  roomState: {
    marginLeft: "auto",
    padding: "3px 7px",
    borderRadius: "999px",
    color: tokens.quiet,
    backgroundColor: "oklch(0.20 0.008 250)",
    fontSize: "12px",
    fontWeight: 700,
  },
});

export function VoiceRoomView(props: VoiceRoomViewProps) {
  const [watchedShares, setWatchedShares] = useState<Record<string, boolean>>({});
  const participants = roomParticipants(props);
  const joined = props.joinedRoomId === props.room.id;
  const status = props.sfu.mediaRoomId === props.room.id ? props.sfu.status : joined ? "joined" : "idle";
  const screenShares = participants
    .filter((participant) => screenOn(participant))
    .map((participant) => ({ participant, preview: participant.screenPreview, stream: screenShareStream(participant) }));
  const activeShares = screenShares.filter((
    share
  ): share is ActiveScreenShare => Boolean(
    share.stream && !share.participant.isLocal && watchedShares[share.participant.id]
  ));
  const inlinedShares = screenShares.filter((share) => {
    if (share.participant.isLocal) return true;
    return !watchedShares[share.participant.id] || !share.stream;
  });
  const remoteAudioStreams = participants
    .filter((participant) => !participant.isLocal && !isVoiceParticipantMuted(participant, props.mutedVoiceParticipantIds) && participant.stream && audioOn(participant) && streamHasTrack(participant.stream, "audio"))
    .map((participant) => ({
      id: participant.id,
      label: `${participant.name} room audio`,
      stream: participant.stream!
    }));
  const stageOpen = props.room.kind === "stage" && props.room.stage?.open === true;
  const localParticipant = participants.find((participant) => participant.isLocal);
  const moderationStatus = props.voiceModeration?.error
    || (props.voiceModeration?.relayStatus === "reconnecting" ? "Voice moderation reconnecting; actions are paused." : undefined)
    || (props.voiceModeration?.relayStatus === "closed" ? "Voice moderation relay is closed." : undefined)
    || (props.voiceModeration?.pending ? "Applying voice moderation…" : undefined)
    || moderationOperationLabel(props.voiceModeration?.lastResult?.operationType);

  function watchShare(participantId: string) {
    props.onWatchScreenShare?.(participantId);
    setWatchedShares((current) => ({ ...current, [participantId]: true }));
  }

  function stopWatchingShare(participantId: string) {
    props.onStopWatchingScreenShare?.(participantId);
    setWatchedShares((current) => ({ ...current, [participantId]: false }));
  }

  return (
    <section {...stylex.props(styles.stage)} aria-labelledby="active-room-heading">
      <RemoteAudioSink mediaDeviceController={props.mediaDeviceController} muted={props.voicePreferences.deafened} streams={remoteAudioStreams} />
      <header {...stylex.props(styles.head)}>
        {props.showSidebarMenu ? (
          <span {...stylex.props(styles.mobileToggle)}>
            <Button
              aria-label="Open navigation"
              onClick={props.onOpenMenu || (() => undefined)}
            >
              <MenuGlyph size={16} />
            </Button>
          </span>
        ) : null}
        <span {...stylex.props(styles.icon)}><MicGlyph size={16} /></span>
        <h2 {...stylex.props(styles.title)} id="active-room-heading">{props.room.name}</h2>
        <span {...stylex.props(styles.subtitle)}>
          {participants.length} {participants.length === 1 ? "connected" : "connected"} · {props.room.allowsVideo === false ? "audio only" : "camera allowed"}
        </span>
        <span {...stylex.props(styles.roomState)}>{status}</span>
        {props.room.kind === "stage" && props.voiceModeration?.available ? (
          <span {...stylex.props(styles.stageControls)}>
            {props.voiceModeration.canStageAction(props.room.id, stageOpen ? "close" : "open") ? (
              <Button
                aria-label={stageOpen ? "Close stage" : "Open stage"}
                onClick={() => { void props.voiceModeration?.stageAction(props.room.id, stageOpen ? "close" : "open"); }}
              >
                {stageOpen ? "Close stage" : "Open stage"}
              </Button>
            ) : null}
            {localParticipant && !localParticipant.stageSpeaker && props.voiceModeration.canStageAction(props.room.id, "requestSpeaker", localParticipant.memberId) ? (
              <Button aria-label="Request to speak" onClick={() => { void props.voiceModeration?.stageAction(props.room.id, "requestSpeaker", localParticipant.memberId); }}>
                Request to speak
              </Button>
            ) : null}
          </span>
        ) : null}
        {props.voiceTextChannel ? (
          <Button
            aria-label={`Open text chat for ${props.voiceTextChannel.name}`}
            onClick={() => props.onOpenVoiceText?.(props.voiceTextChannel!.id)}
          >
            Open text chat
          </Button>
        ) : null}
        {props.voiceModeration && !props.voiceModeration.available ? (
          <span role="status">{props.voiceModeration.unavailableReason}</span>
        ) : null}
        {props.voiceModeration?.available && moderationStatus ? (
          <span role="status">
            {moderationStatus}
            {props.voiceModeration.error ? <Button aria-label="Dismiss voice moderation error" onClick={props.voiceModeration.clearError}>Dismiss</Button> : null}
          </span>
        ) : null}
      </header>

      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.layout)}>
          <VoiceScreenShares
            activeShares={activeShares}
            voiceDeafened={props.voicePreferences.deafened}
            onStopWatching={stopWatchingShare}
          />
          <VoiceParticipantGrid
            actorId={props.actorId}
            mutedVoiceParticipantIds={props.mutedVoiceParticipantIds}
            onDirectMessage={props.onDirectMessage}
            onToggleVoiceParticipantMute={props.onToggleVoiceParticipantMute}
            participants={participants}
            roomId={props.room.id}
            roomName={props.room.name}
            voiceModeration={props.voiceModeration}
            voicePreferences={props.voicePreferences}
            emptyDescription={joined ? "You’re the first one here. Invite people to join this room." : "Join this room to start the conversation."}
            inlinedShares={inlinedShares}
            onWatchScreenShare={watchShare}
          />
        </div>
      </div>
      {props.joinedRoomId === props.room.id ? (
        <div {...stylex.props(styles.controls)}>
          <VoiceControlPanel
            variant="bar"
            canSwapCamera={Boolean(props.voiceControlCanSwapCamera)}
            canUseVideo={Boolean(props.voiceControlCanUseVideo)}
            error={props.voiceControlError}
            label="Voice room controls"
            holdActive={Boolean(props.voiceControlHoldActive)}
            onLeave={props.onLeaveVoiceRoom || (() => undefined)}
            onResumeHold={props.onResumeVoiceRoom}
            onToggleCameraSwap={props.onToggleVoiceCameraSwap}
            onToggleScreenShare={props.onToggleVoiceScreenShare || (() => undefined)}
            onToggleVideo={props.onToggleVoiceVideo || (() => undefined)}
            roomName={props.room.name}
            sfuActive={Boolean(props.voiceControlSfuActive)}
            sfuStatus={props.voiceControlSfuStatus || "idle"}
            showScreenShare={props.voiceControlShowScreenShare ?? true}
            shareActive={Boolean(props.voiceControlShareActive)}
            videoOn={Boolean(props.voiceControlVideoOn)}
          />
        </div>
      ) : null}
    </section>
  );
}
