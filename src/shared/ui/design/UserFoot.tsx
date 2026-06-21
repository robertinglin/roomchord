import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { MicGlyph, GearGlyph } from "./icons";

const styles = stylex.create({
  foot: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderTop: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: tokens.surface,
    flex: "0 0 auto",
  },
  info: { minWidth: 0, flex: 1 },
  name: {
    fontSize: "13.5px",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sub: { fontSize: "11px", color: tokens.quiet },
  btns: { display: "flex", gap: "4px" },
});

export function UserFoot({
  avatar,
  name,
  sub,
  onMute,
  onSettings,
}: {
  avatar: string;
  name: string;
  sub: string;
  onMute?: () => void;
  onSettings?: () => void;
}) {
  return (
    <div {...stylex.props(styles.foot)}>
      <Avatar src={avatar} size="md" status="on" alt={name} />
      <span {...stylex.props(styles.info)}>
        <div {...stylex.props(styles.name)}>{name}</div>
        <div {...stylex.props(styles.sub)}>{sub}</div>
      </span>
      <span {...stylex.props(styles.btns)}>
        <Button variant="etched" size="sm" tone="quiet" title="Mute" onClick={onMute}>
          <MicGlyph size={16} />
        </Button>
        <Button variant="etched" size="sm" tone="quiet" title="Settings" onClick={onSettings}>
          <GearGlyph size={16} />
        </Button>
      </span>
    </div>
  );
}

export default UserFoot;
