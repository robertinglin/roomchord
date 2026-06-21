import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  mention: {
    backgroundColor: tokens.mentionBg,
    color: tokens.mentionFg,
    padding: "0 3px",
    borderRadius: "3px",
    fontWeight: 500,
  },
});

export function Mention({ children }: React.PropsWithChildren) {
  return <span {...stylex.props(styles.mention)}>{children}</span>;
}

export default Mention;
