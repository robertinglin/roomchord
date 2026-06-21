import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";
import { MicGlyph, MicOffGlyph } from "./icons";

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    borderRadius: tokens.radiusItem,
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.panelHover },
  },
  name: {
    fontSize: "13px",
    color: tokens.muted,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  speaking: { color: tokens.success },
  mic: { color: tokens.quiet, flex: "0 0 auto" },
  muted: { color: tokens.danger },
});

export function VoiceMember({
  avatar,
  name,
  speaking,
  muted,
  onClick,
}: {
  avatar: string;
  name: string;
  speaking?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div {...stylex.props(styles.row)} onClick={onClick}>
      <Avatar src={avatar} size="sm" ring alt={name} />
      <span {...stylex.props(styles.name, speaking && styles.speaking)}>{name}</span>
      <span {...stylex.props(styles.mic, muted && styles.muted)}>
        {muted ? <MicOffGlyph size={14} /> : <MicGlyph size={14} />}
      </span>
    </div>
  );
}

export default VoiceMember;
