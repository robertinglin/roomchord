import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  wrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "24px",
    color: tokens.quiet,
  },
  icon: { width: "52px", height: "52px", marginBottom: "16px", color: tokens.quiet, display: "inline-flex" },
  h3: {
    margin: "0 0 6px",
    fontFamily: tokens.fontDisplay,
    fontSize: "20px",
    fontWeight: 700,
    color: tokens.muted,
  },
  p: { margin: 0, fontSize: "14px", maxWidth: "360px", lineHeight: 1.5 },
});

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div {...stylex.props(styles.wrap)}>
      <span {...stylex.props(styles.icon)}>{icon}</span>
      <h3 {...stylex.props(styles.h3)}>{title}</h3>
      <p {...stylex.props(styles.p)}>{description}</p>
    </div>
  );
}

export default EmptyState;
