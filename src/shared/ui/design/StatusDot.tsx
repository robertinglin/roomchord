import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  base: {
    width: "7px",
    height: "7px",
    borderRadius: "999px",
    backgroundColor: tokens.quiet,
    flex: "0 0 auto",
    display: "inline-block",
  },
  on: { backgroundColor: tokens.success },
  warn: { backgroundColor: tokens.warning },
  off: { backgroundColor: tokens.danger },
});

export type DotTone = "on" | "warn" | "off";

export function StatusDot({ tone }: { tone: DotTone }) {
  return <span {...stylex.props(styles.base, styles[tone])} />;
}

export default StatusDot;
