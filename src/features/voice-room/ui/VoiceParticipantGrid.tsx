import React from "react";
import * as stylex from "@stylexjs/stylex";
import type { VoicePreferences } from "@entities/chat/model/localVoicePreferences";
import { VideoStream } from "@shared/ui/CallMedia";
import { MemberContextMenu, type MemberContextMenuAction } from "@shared/ui/MemberContextMenu";
import type { VoiceParticipant } from "@features/voice-room/model/types";
import { audioOn, cameraStream, isVoiceParticipantMuted } from "@features/voice-room/model/voiceParticipants";
import type { ScreenPreviewSnapshot } from "matterhorn-sdk/browser/types";
import { Avatar, Button, HeadphonesGlyph, MicOffGlyph } from "@shared/ui/design";
import { tokens } from "../../../shared/ui/theme.stylex";

const styles = stylex.create({
  grid: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "14px",
    alignContent: "start",
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      padding: "12px",
    },
  },
  empty: {
    maxWidth: "430px",
    margin: "56px auto",
    padding: "0 20px",
    textAlign: "center",
    color: tokens.muted,
  },
  emptyTitle: {
    margin: "0 0 7px",
    fontFamily: tokens.fontDisplay,
    fontSize: "19px",
    letterSpacing: 0,
    color: tokens.fg,
  },
  emptyText: { margin: 0, lineHeight: 1.5 },
  tile: {
    position: "relative",
    minHeight: "164px",
    aspectRatio: "4 / 3",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    border: "1px solid oklch(0.30 0.01 250 / 0.62)",
    borderRadius: tokens.radiusPanel,
    backgroundColor: "oklch(0.235 0.009 250)",
    backgroundImage: "linear-gradient(150deg, oklch(0.255 0.010 250), oklch(0.185 0.009 250))",
    boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.035), 0 1px 2px oklch(0 0 0 / 0.24)",
    transition: "box-shadow 160ms ease, border-color 160ms ease",
  },
  speaking: {
    borderColor: "oklch(0.74 0.13 155 / 0.8)",
    boxShadow: `0 0 0 2px ${tokens.success}, 0 0 22px oklch(0.74 0.13 155 / 0.3)`,
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    display: "grid",
    placeItems: "center",
  },
  overlay: {
    position: "absolute",
    left: "10px",
    bottom: "10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    maxWidth: "calc(100% - 20px)",
    padding: "3px 9px 3px 4px",
    borderRadius: "999px",
    backgroundColor: "rgb(0 0 0 / 0.45)",
    backdropFilter: "blur(4px)",
  },
  name: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12.5px",
    fontWeight: 600,
  },
  stateIcon: {
    display: "inline-flex",
    color: tokens.danger,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  previewPlaceholder: {
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(135deg, oklch(0.24 0.012 250), oklch(0.18 0.012 250))",
  },
  shareOverlay: {
    position: "absolute",
    inset: "auto 10px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px",
    borderRadius: tokens.radiusItem,
    backgroundColor: "rgb(0 0 0 / 0.48)",
    backdropFilter: "blur(4px)",
  },
  shareCopy: { minWidth: 0, display: "grid", gap: "2px" },
  shareTitle: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  shareSub: { color: tokens.quiet, fontSize: "12px" },
});

export function VoiceParticipantGrid({
  actorId,
  mutedVoiceParticipantIds,
  onDirectMessage,
  onToggleVoiceParticipantMute,
  participants,
  roomName,
  voicePreferences,
  inlinedShares,
  onWatchScreenShare
}: {
  actorId: string;
  mutedVoiceParticipantIds?: Record<string, boolean>;
  onDirectMessage?: (memberId: string) => void;
  onToggleVoiceParticipantMute?: (participantId: string) => void;
  participants: VoiceParticipant[];
  roomName: string;
  voicePreferences: VoicePreferences;
  inlinedShares?: Array<{ participant: VoiceParticipant; preview: ScreenPreviewSnapshot | undefined; stream?: MediaStream }>;
  onWatchScreenShare?: (participantId: string) => void;
}) {
  function voiceParticipantActions(participant: VoiceParticipant): MemberContextMenuAction[] {
    if (participant.isLocal || !onToggleVoiceParticipantMute) return [];
    const muted = isVoiceParticipantMuted(participant, mutedVoiceParticipantIds);
    return [{
      id: "voice-mute",
      label: muted ? "Unmute" : "Mute",
      onSelect: () => onToggleVoiceParticipantMute(participant.id)
    }];
  }

  const totalTilesCount = participants.length + (inlinedShares?.length || 0);

  function stateBadge(participant: VoiceParticipant) {
    const muted = isVoiceParticipantMuted(participant, mutedVoiceParticipantIds);
    if (!muted && !participant.deafened) return null;
    return (
      <>
        {muted ? <span {...stylex.props(styles.stateIcon)} aria-label="Muted"><MicOffGlyph size={14} /></span> : null}
        {participant.deafened ? <span {...stylex.props(styles.stateIcon)} aria-label="Deafened"><HeadphonesGlyph size={14} /></span> : null}
      </>
    );
  }

  return (
    <div {...stylex.props(styles.grid)} aria-label={`${roomName} participants`}>
      {totalTilesCount === 0 ? (
        <div {...stylex.props(styles.empty)}>
          <h3 {...stylex.props(styles.emptyTitle)}>No one is in this room</h3>
          <p {...stylex.props(styles.emptyText)}>No active voice participants.</p>
        </div>
      ) : null}
      {participants.map((participant) => {
        const label = participant.isLocal ? "Your room video" : `${participant.name} room video`;
        const participantCameraStream = cameraStream(participant);
        const hasVideo = Boolean(participantCameraStream);
        return (
          <article {...stylex.props(styles.tile, audioOn(participant) && styles.speaking)} aria-label={`${participant.name} participant`} key={participant.id}>
            <MemberContextMenu
              additionalActions={voiceParticipantActions(participant)}
              currentUserId={actorId}
              memberId={participant.memberId}
              memberName={participant.name}
              onDirectMessage={onDirectMessage}
            >
              {hasVideo ? (
                <VideoStream {...stylex.props(styles.video)} label={label} muted={participant.isLocal || voicePreferences.deafened} stream={participantCameraStream} />
              ) : (
                <div {...stylex.props(styles.avatarPlaceholder)}>
                  <Avatar name={participant.name} avatar={participant.avatar} size="xl" />
                </div>
              )}
            </MemberContextMenu>
            <span {...stylex.props(styles.overlay)}>
              <Avatar name={participant.name} avatar={participant.avatar} size="xs" />
              <span {...stylex.props(styles.name)}>{participant.name}</span>
              {stateBadge(participant)}
            </span>
          </article>
        );
      })}
      {inlinedShares?.map(({ participant, preview, stream }) => {
        const isLocalShare = participant.isLocal;
        const key = `${participant.id}-screen`;
        
        if (isLocalShare) {
          return (
            <article
              {...stylex.props(styles.tile)}
              key={key}
            >
              {stream ? (
                <VideoStream
                  {...stylex.props(styles.video)}
                  label="Your screen share"
                  muted={true}
                  stream={stream}
                />
              ) : (
                <div {...stylex.props(styles.previewPlaceholder)} aria-label="Your screen share preview" />
              )}
              <div {...stylex.props(styles.shareOverlay)}>
                <span {...stylex.props(styles.shareCopy)}>
                  <strong {...stylex.props(styles.shareTitle)}>Your screen</strong>
                  <small {...stylex.props(styles.shareSub)}>Sharing now</small>
                </span>
              </div>
            </article>
          );
        } else {
          return (
            <article
              {...stylex.props(styles.tile)}
              key={key}
            >
              {preview?.dataUrl ? (
                <img
                  alt=""
                  aria-label={`${participant.name} screen share preview`}
                  {...stylex.props(styles.previewImage)}
                  src={preview.dataUrl}
                />
              ) : (
                <div {...stylex.props(styles.previewPlaceholder)} aria-label={`${participant.name} screen share preview`} />
              )}
              <div {...stylex.props(styles.shareOverlay)}>
                <span {...stylex.props(styles.shareCopy)}>
                  <strong {...stylex.props(styles.shareTitle)}>{participant.name}</strong>
                  <small {...stylex.props(styles.shareSub)}>Screen share</small>
                </span>
                <Button
                  variant="etched"
                  tone="muted"
                  aria-label={`Watch ${participant.name} screen share`}
                  onClick={() => onWatchScreenShare?.(participant.id)}
                >
                  Watch
                </Button>
              </div>
            </article>
          );
        }
      })}
    </div>
  );
}
