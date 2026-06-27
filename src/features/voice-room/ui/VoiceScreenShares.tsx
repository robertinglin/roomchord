import React from "react";
import * as stylex from "@stylexjs/stylex";
import type { ScreenPreviewSnapshot } from "matterhorn-sdk/browser/types";
import { VideoStream } from "@shared/ui/CallMedia";
import { tokens } from "../../../shared/ui/theme.stylex";
import type { VoiceParticipant } from "@features/voice-room/model/types";

export type ActiveScreenShare = {
  participant: VoiceParticipant;
  preview: ScreenPreviewSnapshot | undefined;
  stream: MediaStream;
};

const styles = stylex.create({
  wrap: {
    minHeight: 0,
    flex: "1 1 0%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  stage: {
    minHeight: 0,
    flex: "1 1 0%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    "@media (max-width: 720px)": {
      height: "auto",
      flex: "none",
    },
  },
  card: {
    position: "relative",
    minWidth: 0,
    minHeight: 0,
    maxWidth: "100%",
    maxHeight: "100%",
    width: "auto",
    height: "auto",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    border: `1px solid ${tokens.surfaceDeep}`,
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    "@media (max-width: 720px)": {
      minHeight: "190px",
      width: "100%",
      height: "auto",
      maxWidth: "none",
      maxHeight: "none",
      aspectRatio: "1 / 1",
    },
  },
  video: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "contain",
    backgroundColor: tokens.surfaceDeep,
  },
  overlay: {
    position: "absolute",
    left: "10px",
    right: "10px",
    bottom: "10px",
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "10px",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: tokens.radiusItem,
    color: tokens.fg,
    backgroundColor: "oklch(0.16 0.006 260 / 0.84)",
  },
  overlayCopy: {
    minWidth: 0,
    display: "grid",
    gap: "2px",
  },
  overlayTitle: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  overlayHint: {
    color: tokens.quiet,
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  stopButton: {
    minHeight: "32px",
    padding: "0 10px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.fg,
    backgroundColor: tokens.surface,
    fontSize: "12px",
    fontWeight: 900,
    cursor: "pointer",
    ":focus": {
      outline: "none",
    },
    ":hover": {
      backgroundColor: tokens.panelHover,
    },
  },
});

export function VoiceScreenShares({
  activeShares,
  onStopWatching,
  voiceDeafened
}: {
  activeShares: ActiveScreenShare[];
  onStopWatching: (participantId: string) => void;
  voiceDeafened: boolean;
}) {
  if (!activeShares.length) return null;

  return (
    <div {...stylex.props(styles.wrap)}>
      <div {...stylex.props(styles.stage)} aria-label="Active screen shares">
        {activeShares.map(({ participant, stream }) => (
          <article {...stylex.props(styles.card)} key={participant.id}>
            <VideoStream
              {...stylex.props(styles.video)}
              label={participant.isLocal ? "Your screen share" : `${participant.name} screen share`}
              muted={participant.isLocal || voiceDeafened}
              stream={stream}
            />
            <div {...stylex.props(styles.overlay)}>
              <span {...stylex.props(styles.overlayCopy)}>
                <strong {...stylex.props(styles.overlayTitle)}>{participant.isLocal ? "Your screen" : `${participant.name}'s screen`}</strong>
                <small {...stylex.props(styles.overlayHint)}>{participant.isLocal ? "Sharing now" : "Watching"}</small>
              </span>
              {!participant.isLocal ? (
                <button
                  {...stylex.props(styles.stopButton)}
                  type="button"
                  aria-label={`Stop watching ${participant.name} screen share`}
                  onClick={() => onStopWatching(participant.id)}
                >
                  Stop
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
