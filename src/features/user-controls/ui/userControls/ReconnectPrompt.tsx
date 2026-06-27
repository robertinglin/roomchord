import React from "react";
import * as stylex from "@stylexjs/stylex";
import type { MediaRoom } from "@entities/chat/model/types";
import { tokens } from "../../../../shared/ui/theme.stylex";

const styles = stylex.create({
  panel: {
    minWidth: 0,
    display: "grid",
    gap: "10px",
    padding: "10px",
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surface,
  },
  copy: {
    minWidth: 0,
    display: "grid",
    gap: "2px",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "10px",
  },
  primaryButton: {
    minHeight: "32px",
    padding: "0 12px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.accentInk,
    backgroundColor: tokens.accent,
    fontWeight: 800,
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.accentHover,
    },
  },
  ghostButton: {
    minHeight: "32px",
    padding: "0 12px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    fontWeight: 800,
    cursor: "pointer",
    ":hover": {
      color: tokens.fg,
      backgroundColor: tokens.panelHover,
    },
  },
});

export function ReconnectPrompt({
  room,
  onDismiss,
  onReconnect
}: {
  room: MediaRoom;
  onDismiss: () => void;
  onReconnect: (room: MediaRoom) => void;
}) {
  return (
    <section {...stylex.props(styles.panel)} aria-label="Voice reconnect prompt">
      <span {...stylex.props(styles.copy)}>
        <strong>Reconnect to {room.name}?</strong>
        <small>Recent voice session</small>
      </span>
      <span {...stylex.props(styles.actions)}>
        <button {...stylex.props(styles.primaryButton)} type="button" onClick={() => onReconnect(room)}>
          Reconnect
        </button>
        <button {...stylex.props(styles.ghostButton)} type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </span>
    </section>
  );
}
