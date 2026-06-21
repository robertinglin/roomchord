import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  group: { marginBottom: "16px" },
  head: {
    padding: "8px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tokens.quiet,
  },
  headB: { color: tokens.muted, fontWeight: 700 },
});

export function RailGroup({
  label,
  count,
  children,
}: React.PropsWithChildren<{ label: string; count: number }>) {
  return (
    <div {...stylex.props(styles.group)}>
      <div {...stylex.props(styles.head)}>
        {label} — <b {...stylex.props(styles.headB)}>{count}</b>
      </div>
      {children}
    </div>
  );
}

export default RailGroup;
