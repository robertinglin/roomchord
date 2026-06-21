import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "2px 7px",
    borderRadius: "999px",
    fontSize: "12px",
    backgroundColor: tokens.fieldBg,
    color: tokens.muted,
    border: "1px solid transparent",
    cursor: "pointer",
    ":hover": { borderColor: tokens.border },
  },
  mine: {
    backgroundColor: tokens.accentSoft,
    color: tokens.mentionFg,
    borderColor: "oklch(0.73 0.13 40 / 0.3)",
  },
});

export function Reaction({
  emoji,
  count,
  mine,
  onClick,
}: {
  emoji: string;
  count: number;
  mine?: boolean;
  onClick?: () => void;
}) {
  return (
    <span {...stylex.props(styles.base, mine && styles.mine)} onClick={onClick}>
      {emoji} {count}
    </span>
  );
}

export default Reaction;
