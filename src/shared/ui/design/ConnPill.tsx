import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { StatusDot, type DotTone } from "./StatusDot";

const styles = stylex.create({
  base: {
    flex: "0 0 auto",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "4px 9px",
    borderRadius: "999px",
    backgroundColor: tokens.fieldBg,
    color: tokens.muted,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    "@media (min-width: 600px) and (max-width: 1024px)": {
      display: "none",
    },
  },
  on: { color: tokens.success },
  warn: { color: tokens.warning },
  off: { color: tokens.danger },
});

export function ConnPill({ tone, label }: { tone: DotTone; label: string }) {
  return (
    <span {...stylex.props(styles.base, styles[tone])}>
      <StatusDot tone={tone} />
      {label}
    </span>
  );
}

export default ConnPill;
