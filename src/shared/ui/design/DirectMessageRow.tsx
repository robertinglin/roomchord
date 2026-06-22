import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar, type PresenceStatus } from "./Avatar";
import { Button } from "./Button";
import { CloseGlyph } from "./icons";

const styles = stylex.create({
  // Wrapper grid: [select button | close button]. Keeps the row a single hit
  // target while allowing an affordance to dismiss the thread.
  wrap: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) auto",
    alignItems: "center",
    gap: "4px",
    borderRadius: tokens.radiusItem,
    ":hover": { backgroundColor: tokens.panelHover },
  },
  wrapActive: { backgroundColor: tokens.panelActive },
  row: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "32px minmax(0,1fr) auto",
    alignItems: "center",
    gap: "10px",
    minHeight: "40px",
    padding: "5px 8px",
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    textAlign: "left",
    border: 0,
    background: "transparent",
    cursor: "pointer",
    transition: "background 140ms, color 140ms",
    ":hover": { color: tokens.fg },
  },
  rowActive: { color: tokens.fg },
  text: { minWidth: 0 },
  name: {
    display: "block",
    fontSize: "14px",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sub: {
    display: "block",
    fontSize: "12px",
    color: tokens.quiet,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  close: {
    flex: "0 0 auto",
  },
});

/**
 * DM row: avatar + name (+ optional preview subtext) + optional unread badge,
 * with an optional close affordance. `avatar` may be a URL or left undefined
 * to fall back to the `name` initial (via the Avatar atom).
 */
export function DirectMessageRow({
  avatar,
  name,
  preview,
  status,
  badge,
  active,
  onClose,
  onClick,
  "aria-label": ariaLabel,
}: {
  avatar?: string;
  name: string;
  preview?: string;
  status?: PresenceStatus;
  badge?: React.ReactNode;
  active?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const row = (
    <button
      {...stylex.props(styles.row, active && styles.rowActive)}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <Avatar avatar={avatar} name={name} size="md" status={status} alt={name} />
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.name)}>{name}</span>
        {preview ? <span {...stylex.props(styles.sub)}>{preview}</span> : null}
      </span>
      {badge}
    </button>
  );

  if (!onClose) return row;

  return (
    <div {...stylex.props(styles.wrap, active && styles.wrapActive)}>
      {row}
      <span {...stylex.props(styles.close)}>
        <Button
          size="sm"
          tone="quiet"
          title={`Close ${name} DM`}
          aria-label={`Close ${name} DM`}
          onClick={onClose}
        >
          <CloseGlyph size={12} />
        </Button>
      </span>
    </div>
  );
}

export default DirectMessageRow;
