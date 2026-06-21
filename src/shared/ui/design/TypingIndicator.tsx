import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const blinkAnim = stylex.keyframes({
  "0%": { opacity: 0.3 },
  "30%": { opacity: 1 },
  "60%": { opacity: 0.3 },
  "100%": { opacity: 0.3 },
});

const styles = stylex.create({
  wrap: {
    flex: "0 0 auto",
    padding: "5px 16px 6px",
    fontSize: "12.5px",
    color: tokens.quiet,
    minHeight: "26px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  dots: { display: "inline-flex", gap: "3px" },
  dot: {
    width: "5px",
    height: "5px",
    borderRadius: "999px",
    backgroundColor: tokens.quiet,
    animationName: blinkAnim,
    animationDuration: "1.3s",
    animationIterationCount: "infinite",
  },
  dot2: { animationDelay: "0.2s" },
  dot3: { animationDelay: "0.4s" },
});

export function TypingIndicator({ who }: { who: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <span {...stylex.props(styles.dots)}>
        <i {...stylex.props(styles.dot)} />
        <i {...stylex.props(styles.dot, styles.dot2)} />
        <i {...stylex.props(styles.dot, styles.dot3)} />
      </span>
      <span>{who}</span>
    </div>
  );
}

export default TypingIndicator;
