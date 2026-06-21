import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "4px 16px 6px",
    "::after": { content: "", height: "1px", backgroundColor: tokens.accent, flex: 1 },
  },
  label: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: tokens.accent,
  },
});

export function NewSeparator() {
  return (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.label)}>New</span>
    </div>
  );
}

export default NewSeparator;
