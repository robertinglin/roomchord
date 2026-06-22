import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  base: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "8px",
    minHeight: "34px",
    padding: "0 8px",
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    textAlign: "left",
    fontSize: "14.5px",
    border: 0,
    cursor: "pointer",
    transition: "background 140ms, color 140ms",
    ":hover": { backgroundColor: tokens.panelHover, color: tokens.fg },
  },
  active: { backgroundColor: tokens.panelActive, color: tokens.fg },
  icon: { color: tokens.quiet, display: "inline-flex", width: "18px", height: "18px", flex: "0 0 auto" },
  iconActive: { color: tokens.accent },
  text: { minWidth: 0 },
  name: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" },
  topic: {
    display: "block",
    fontSize: "11.5px",
    color: tokens.quiet,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

/**
 * Channel list row. `icon` is a glyph (hash for text channels, speaker/mic
 * for voice); `badge` is an optional unread count; `topic` adds muted subtext
 * under the name (used by the live channel list).
 *
 * NOTE: chat.html couples the icon color to the row :hover (icon → muted on
 * hover). StyleX cannot express parent→child hover across the icon passed in
 * as a prop, so the icon keeps its resting color on hover. Accepted limit.
 */
export function ChannelRow({
  icon,
  name,
  topic,
  badge,
  active,
  voice,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  icon: React.ReactNode;
  name: string;
  topic?: string;
  badge?: React.ReactNode;
  active?: boolean;
  voice?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      {...stylex.props(styles.base, active && styles.active)}
      data-voice={voice ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      type="button"
      aria-label={ariaLabel}
    >
      <span {...stylex.props(styles.icon, active && styles.iconActive)}>{icon}</span>
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.name)}>{name}</span>
        {topic ? <small {...stylex.props(styles.topic)}>{topic}</small> : null}
      </span>
      {badge}
    </button>
  );
}

export default ChannelRow;
