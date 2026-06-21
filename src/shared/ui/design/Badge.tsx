import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  base: {
    fontSize: "10px",
    fontWeight: 700,
    minWidth: "17px",
    height: "17px",
    padding: "0 5px",
    borderRadius: "999px",
    display: "inline-grid",
    placeItems: "center",
    backgroundColor: tokens.accent,
    color: "oklch(0.18 0.05 40)",
  },
});

export function Badge({ count }: { count: number | string }) {
  return <span {...stylex.props(styles.base)}>{count}</span>;
}

export default Badge;
