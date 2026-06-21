import React from "react";
import * as stylex from "@stylexjs/stylex";

const spinAnim = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  banner: {
    display: "none",
    alignItems: "center",
    gap: "10px",
    padding: "9px 16px",
    backgroundColor: "oklch(0.68 0.18 25 / 0.14)",
    borderBottom: "1px solid oklch(0.68 0.18 25 / 0.3)",
    color: "oklch(0.82 0.09 25)",
    fontSize: "13px",
    flex: "0 0 auto",
  },
  show: { display: "flex" },
  spin: {
    flex: "0 0 auto",
    width: "13px",
    height: "13px",
    border: "2px solid oklch(0.82 0.09 25 / 0.3)",
    borderTopColor: "oklch(0.82 0.09 25)",
    borderRadius: "999px",
    animationName: spinAnim,
    animationDuration: "0.8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

export function ConnBanner({ show, children }: React.PropsWithChildren<{ show: boolean }>) {
  return (
    <div {...stylex.props(styles.banner, show && styles.show)}>
      <span {...stylex.props(styles.spin)} />
      {children}
    </div>
  );
}

export default ConnBanner;
