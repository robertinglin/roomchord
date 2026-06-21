import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

export type PresenceStatus = "on" | "idle" | "dnd" | "off";
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const DIMS: Record<AvatarSize, number> = { xs: 18, sm: 22, md: 32, lg: 40, xl: 64 };

const styles = stylex.create({
  wrap: {
    position: "relative",
    display: "inline-block",
    flex: "0 0 auto",
    verticalAlign: "middle",
  },
  img: {
    borderRadius: "999px",
    objectFit: "cover",
    display: "block",
  },
  imgRing: {
    boxShadow: `0 0 0 2px ${tokens.surface}`,
  },
  stat: {
    position: "absolute",
    right: "-2px",
    bottom: "-2px",
    width: "11px",
    height: "11px",
    borderRadius: "999px",
    border: `2.5px solid ${tokens.surface}`,
  },
  statOn: { backgroundColor: tokens.success },
  statIdle: { backgroundColor: tokens.warning },
  statDnd: { backgroundColor: tokens.danger },
  statOff: { backgroundColor: tokens.quiet },
  imgOff: { filter: "saturate(0.35) brightness(0.7)" },
});

/**
 * Image avatar with optional presence pip. Sizes:
 *   xs 18 (voice tile info chip) · sm 22 (voice member) · md 32 (DM/rail/user)
 *   lg 40 (chat message) · xl 64 (voice tile center).
 *
 * `ring` adds the 2px surface ring used by voice-member avatars.
 */
export function Avatar({
  src,
  size = "md",
  status,
  ring,
  alt = "",
  desaturate,
}: {
  src: string;
  size?: AvatarSize;
  status?: PresenceStatus;
  ring?: boolean;
  alt?: string;
  desaturate?: boolean;
}) {
  const px = DIMS[size];
  return (
    <span {...stylex.props(styles.wrap)} style={{ width: px, height: px }}>
      <img
        {...stylex.props(styles.img, ring && styles.imgRing, desaturate && styles.imgOff)}
        src={src}
        alt={alt}
        width={px}
        height={px}
      />
      {status && (
        <span
          {...stylex.props(
            styles.stat,
            status === "on" && styles.statOn,
            status === "idle" && styles.statIdle,
            status === "dnd" && styles.statDnd,
            status === "off" && styles.statOff,
          )}
        />
      )}
    </span>
  );
}

export default Avatar;
