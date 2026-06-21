import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  tag: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: tokens.accentSoft,
    color: tokens.mentionFg,
  },
});

export function RoleTag({ children }: React.PropsWithChildren) {
  return <span {...stylex.props(styles.tag)}>{children}</span>;
}

export default RoleTag;
