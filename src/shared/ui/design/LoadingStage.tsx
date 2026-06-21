import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  stage: {
    position: "absolute",
    inset: 0,
    display: "none",
    placeItems: "center",
    padding: "24px",
    backgroundColor: tokens.bg,
    zIndex: 30,
  },
  show: { display: "grid" },
});

/** Full-cover overlay that centers a StateCard. */
export function LoadingStage({
  show,
  children,
}: React.PropsWithChildren<{ show: boolean }>) {
  return <div {...stylex.props(styles.stage, show && styles.show)}>{children}</div>;
}

export default LoadingStage;
