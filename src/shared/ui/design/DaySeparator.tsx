import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 16px 12px",
    "::before": { content: "", height: "1px", backgroundColor: tokens.borderSoft, flex: 1 },
    "::after": { content: "", height: "1px", backgroundColor: tokens.borderSoft, flex: 1 },
  },
  label: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: tokens.quiet,
  },
});

export function DaySeparator({ label }: { label: string }) {
  return (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.label)}>{label}</span>
    </div>
  );
}

export default DaySeparator;
