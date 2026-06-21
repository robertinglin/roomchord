import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Avatar } from "./Avatar";
import { MicOffGlyph } from "./icons";

const styles = stylex.create({
  tile: {
    position: "relative",
    aspectRatio: "4 / 3",
    borderRadius: tokens.radiusPanel,
    overflow: "hidden",
    background: "linear-gradient(150deg,oklch(0.26 0.01 250),oklch(0.19 0.01 250))",
    border: `1px solid ${tokens.borderSoft}`,
    display: "grid",
    placeItems: "center",
    transition: "box-shadow 160ms",
  },
  speaking: { boxShadow: `0 0 0 2px ${tokens.success},0 0 22px oklch(0.74 0.13 155 / 0.3)` },
  info: {
    position: "absolute",
    left: "10px",
    bottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "3px 9px 3px 4px",
    borderRadius: "999px",
    backgroundColor: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(4px)",
  },
  infoName: { fontSize: "12.5px", fontWeight: 600, color: "#fff" },
  ic: { position: "absolute", top: "10px", right: "10px", display: "flex", gap: "5px" },
  mutedBadge: {
    width: "15px",
    height: "15px",
    padding: "4px",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: "999px",
    color: tokens.danger,
    display: "inline-flex",
  },
});

export function VoiceTile({
  avatar,
  name,
  speaking,
  muted,
  you,
}: {
  avatar: string;
  name: string;
  speaking?: boolean;
  muted?: boolean;
  you?: boolean;
}) {
  return (
    <div {...stylex.props(styles.tile, speaking && styles.speaking)}>
      <Avatar src={avatar} size="xl" alt={name} />
      <div {...stylex.props(styles.ic)}>
        {muted && (
          <span {...stylex.props(styles.mutedBadge)}>
            <MicOffGlyph size={15} />
          </span>
        )}
      </div>
      <div {...stylex.props(styles.info)}>
        <Avatar src={avatar} size="xs" alt={name} />
        <span {...stylex.props(styles.infoName)}>
          {name}
          {you ? " (you)" : ""}
        </span>
      </div>
    </div>
  );
}

export default VoiceTile;
