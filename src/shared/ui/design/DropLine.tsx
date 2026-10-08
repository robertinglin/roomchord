import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  line: {
    width: "100%",
    height: "1px",
    margin: "4px 0",
    padding: 0,
    border: 0,
    backgroundColor: tokens.accent,
  },
});

export function DropLine({ marker }: { marker: string }) {
  return <hr aria-hidden="true" data-drop-line={marker} {...stylex.props(styles.line)} />;
}
