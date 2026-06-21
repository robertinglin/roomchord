import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar, type PresenceStatus } from "./Avatar";

const styles = stylex.create({
  member: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "5px 8px",
    borderRadius: tokens.radiusItem,
    cursor: "default",
    ":hover": { backgroundColor: tokens.panelHover },
  },
  info: { minWidth: 0, flex: 1 },
  name: {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  nameOff: { color: tokens.quiet },
  sub: {
    display: "block",
    fontSize: "11.5px",
    color: tokens.quiet,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export function RailMember({
  avatar,
  name,
  sub,
  status,
}: {
  avatar: string;
  name: string;
  sub: string;
  status: PresenceStatus;
}) {
  const offline = status === "off";
  return (
    <div {...stylex.props(styles.member)}>
      <Avatar src={avatar} size="md" status={status} desaturate={offline} alt={name} />
      <span {...stylex.props(styles.info)}>
        <span {...stylex.props(styles.name, offline && styles.nameOff)}>{name}</span>
        <span {...stylex.props(styles.sub)}>{sub}</span>
      </span>
    </div>
  );
}

export default RailMember;
