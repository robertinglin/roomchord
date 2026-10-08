import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { PinGlyph } from "./icons";

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
  dragging: { opacity: 0.42, transform: "scale(0.98)" },
  icon: { color: tokens.quiet, display: "inline-flex", width: "18px", height: "18px", flex: "0 0 auto" },
  iconWrap: { position: "relative", display: "inline-flex", width: "18px", height: "18px", flex: "0 0 auto" },
  pinBadge: {
    position: "absolute",
    top: "-5px",
    right: "-6px",
    width: "11px",
    height: "11px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: tokens.surfaceDeep,
    color: tokens.accent,
    boxShadow: `0 0 0 1px ${tokens.surfaceDeep}`,
  },
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
  pinned,
  active,
  voice,
  disabled,
  dragging,
  onClick,
  dragProps,
  "aria-label": ariaLabel,
}: {
  icon: React.ReactNode;
  name: string;
  topic?: string;
  badge?: React.ReactNode;
  pinned?: boolean;
  active?: boolean;
  voice?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  onClick?: () => void;
  dragProps?: React.HTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  "aria-label"?: string;
}) {
  return (
    <button
      {...stylex.props(styles.base, active && styles.active, dragging && styles.dragging)}
      data-voice={voice ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      {...dragProps}
      type="button"
      aria-label={ariaLabel}
    >
      <span {...stylex.props(styles.icon, styles.iconWrap, active && styles.iconActive)}>
        {icon}
        {pinned ? <span aria-label="Pinned channel" data-pinned="true" {...stylex.props(styles.pinBadge)}><PinGlyph size={9} /></span> : null}
      </span>
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.name)}>{name}</span>
        {topic ? <small {...stylex.props(styles.topic)}>{topic}</small> : null}
      </span>
      {badge}
    </button>
  );
}

export default ChannelRow;
