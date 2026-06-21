import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar, type PresenceStatus } from "./Avatar";

const styles = stylex.create({
  row: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr) auto",
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
    ":hover": { backgroundColor: tokens.panelHover, color: tokens.fg },
  },
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
});

export function DirectMessageRow({
  avatar,
  name,
  preview,
  status,
  onClick,
}: {
  avatar: string;
  name: string;
  preview: string;
  status: PresenceStatus;
  onClick?: () => void;
}) {
  return (
    <button {...stylex.props(styles.row)} type="button" onClick={onClick}>
      <Avatar src={avatar} size="md" status={status} alt={name} />
      <span {...stylex.props(styles.text)}>
        <span {...stylex.props(styles.name)}>{name}</span>
        <span {...stylex.props(styles.sub)}>{preview}</span>
      </span>
    </button>
  );
}

export default DirectMessageRow;
