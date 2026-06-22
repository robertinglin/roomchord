import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";
import { HeadphonesGlyph, MicOffGlyph } from "./icons";

const styles = stylex.create({
  row: {
    width: "100%",
    minHeight: "30px",
    display: "grid",
    gridTemplateColumns: "22px minmax(0, 1fr) auto auto",
    alignItems: "center",
    gap: "8px",
    padding: "3px 8px",
    borderRadius: tokens.radiusItem,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.panelHover },
  },
  name: {
    fontSize: "13px",
    color: tokens.muted,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  speaking: { color: tokens.success },
  stateIcon: {
    display: "inline-flex",
    color: tokens.danger,
    flex: "0 0 auto",
  },
});

/**
 * A participant inside an expanded voice channel. `avatar` may be a URL or
 * undefined (falls back to the `name` initial via the Avatar atom). Pass
 * `wrap` to surround the row with a context-menu trigger or similar.
 */
export function VoiceMember({
  avatar,
  deafened,
  muted,
  name,
  speaking,
  onClick,
  wrap,
}: {
  avatar?: string;
  deafened?: boolean;
  muted?: boolean;
  name: string;
  speaking?: boolean;
  onClick?: () => void;
  /** Wrap the rendered row (e.g. in a <MemberContextMenu> trigger). */
  wrap?: (children: React.ReactNode) => React.ReactNode;
}) {
  const row = (
    <div {...stylex.props(styles.row)} onClick={onClick}>
      <Avatar avatar={avatar} name={name} size="sm" ring alt={name} />
      <span {...stylex.props(styles.name, speaking && styles.speaking)}>{name}</span>
      {muted ? (
        <span {...stylex.props(styles.stateIcon)} aria-label="Muted">
          <MicOffGlyph size={14} />
        </span>
      ) : null}
      {deafened ? (
        <span {...stylex.props(styles.stateIcon)} aria-label="Deafened">
          <HeadphonesGlyph size={14} />
        </span>
      ) : null}
    </div>
  );
  return <>{wrap ? wrap(row) : row}</>;
}

export default VoiceMember;
