import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";

const styles = stylex.create({
  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "16px",
    padding: "0 5px",
    borderRadius: "4px",
    backgroundColor: tokens.accentSoft,
    color: tokens.mentionFg,
    fontSize: "9px",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: ".04em",
    verticalAlign: "middle",
  },
});

export function BotBadge() {
  return <span {...stylex.props(styles.badge)} aria-label="Bot account">BOT</span>;
}
