import React from "react";
import * as stylex from "@stylexjs/stylex";
import { Button, LeaveGlyph, ScreenGlyph, SpeakerGlyph, VideoGlyph } from "@shared/ui/design";
import { tokens } from "./theme.stylex";

const styles = stylex.create({
  panel: {
    display: "grid",
    gap: "10px",
    padding: "10px",
    border: `1px solid ${tokens.borderSoft}`,
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    boxShadow: tokens.elevCtrl,
  },
  panelConnected: { borderColor: "oklch(0.74 0.13 155 / 0.28)" },
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: 0,
    border: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "16px minmax(0, 1fr) 32px",
    alignItems: "center",
    gap: "8px",
  },
  headerHidden: { display: "none" },
  statusIcon: { color: tokens.success },
  headerCopy: { minWidth: 0, display: "grid", gap: "2px" },
  title: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.fg,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "13px",
    fontWeight: 700,
  },
  sub: {
    minWidth: 0,
    overflow: "hidden",
    color: tokens.quiet,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "11px",
  },
  row: { display: "flex", alignItems: "center", gap: "8px" },
  rowBar: { gap: "10px" },
  textHidden: { display: "none" },
  error: {
    margin: 0,
    color: tokens.danger,
    fontSize: "12px",
    fontWeight: 700,
  },
});

export function VoiceControlPanel({
  canUseVideo,
  canSwapCamera = false,
  error,
  label = "Voice controls",
  onLeave,
  onToggleCameraSwap,
  onToggleScreenShare,
  onToggleVideo,
  roomName,
  sfuActive,
  sfuStatus,
  showScreenShare = true,
  shareActive,
  variant = "panel",
  videoOn
}: {
  canUseVideo: boolean;
  canSwapCamera?: boolean;
  error?: string;
  label?: string;
  onLeave: () => void;
  onToggleCameraSwap?: () => void;
  onToggleScreenShare: () => void;
  onToggleVideo: () => void;
  roomName: string;
  sfuActive: boolean;
  sfuStatus: string;
  showScreenShare?: boolean;
  shareActive: boolean;
  variant?: "panel" | "bar";
  videoOn: boolean;
}) {
  const voiceTitle = sfuActive && sfuStatus === "connecting" ? "Voice connecting" : sfuActive ? "Voice connected" : "Voice joined";
  const bar = variant === "bar";
  return (
    <section {...stylex.props(styles.panel, sfuActive && styles.panelConnected, bar && styles.bar)} aria-label={label}>
      <div {...stylex.props(styles.header, bar && styles.headerHidden)}>
        <span {...stylex.props(styles.statusIcon)}>
          <SpeakerGlyph size={16} />
        </span>
        <span {...stylex.props(styles.headerCopy)}>
          <strong {...stylex.props(styles.title)}>{voiceTitle}</strong>
          <small {...stylex.props(styles.sub)}>{roomName}</small>
        </span>
        <Button variant="etched" tone="danger" aria-label="Leave voice room" title="Leave voice room" onClick={onLeave}>
          <LeaveGlyph size={16} />
        </Button>
      </div>

      <div {...stylex.props(styles.row, bar && styles.rowBar)}>
        <Button
          shape={bar ? "round" : "square"}
          size={bar ? "lg" : "md"}
          variant="etched"
          tone={videoOn ? "success" : "danger"}
          state={videoOn ? "on" : "off"}
          aria-label={videoOn ? "Turn camera off" : "Turn camera on"}
          disabled={!canUseVideo}
          onClick={onToggleVideo}
        >
          <VideoGlyph size={16} />
          <span {...stylex.props(styles.textHidden)}>{videoOn ? "Video on" : "Video off"}</span>
        </Button>
        {showScreenShare ? (
          <Button
            shape={bar ? "round" : "square"}
            size={bar ? "lg" : "md"}
            variant="etched"
            tone={shareActive ? "success" : "muted"}
            state={shareActive ? "on" : undefined}
            aria-label={shareActive ? "Stop screen share" : "Share screen"}
            onClick={onToggleScreenShare}
          >
            <ScreenGlyph size={16} />
            <span {...stylex.props(styles.textHidden)}>{shareActive ? "Stop share" : "Share"}</span>
          </Button>
        ) : null}
        {canSwapCamera ? (
          <Button
            shape={bar ? "round" : "square"}
            size={bar ? "lg" : "md"}
            variant="etched"
            tone="muted"
            aria-label="Flip camera"
            onClick={onToggleCameraSwap}
          >
            <VideoGlyph size={16} />
            <span {...stylex.props(styles.textHidden)}>Flip</span>
          </Button>
        ) : null}
        {bar ? (
          <Button shape="round" size="lg" variant="solid" tone="danger" aria-label="Leave voice room" title="Leave voice room" onClick={onLeave}>
            <LeaveGlyph size={16} />
          </Button>
        ) : null}
      </div>

      {error ? <p {...stylex.props(styles.error)}>{error}</p> : null}
    </section>
  );
}
