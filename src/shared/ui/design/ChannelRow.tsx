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
  icon: { color: tokens.quiet, display: "inline-flex", width: "18px", height: "18px" },
  iconActive: { color: tokens.accent },
  name: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
});

/**
 * Channel list row. `icon` is a glyph (speaker for text channels, mic for
 * voice); `badge` is an optional unread count.
 *
 * NOTE: chat.html couples the icon color to the row :hover (icon → muted on
 * hover). StyleX cannot express parent→child hover across the icon passed in
 * as a prop, so the icon keeps its resting color on hover. Accepted limit.
 */
export function ChannelRow({
  icon,
  name,
  badge,
  active,
  voice,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  badge?: React.ReactNode;
  active?: boolean;
  voice?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      {...stylex.props(styles.base, active && styles.active)}
      data-voice={voice ? "true" : undefined}
      onClick={onClick}
      type="button"
    >
      <span {...stylex.props(styles.icon, active && styles.iconActive)}>{icon}</span>
      <span {...stylex.props(styles.name)}>{name}</span>
      {badge}
    </button>
  );
}

export default ChannelRow;
