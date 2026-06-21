import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Button } from "./Button";

const spinAnim = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  card: {
    width: "min(440px,100%)",
    padding: "28px",
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surface,
    border: `1px solid ${tokens.borderSoft}`,
    boxShadow: tokens.elevPanel,
    textAlign: "center",
  },
  ic: {
    width: "56px",
    height: "56px",
    margin: "0 auto 16px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    backgroundColor: tokens.accentSoft,
    color: tokens.accent,
  },
  spinner: {
    width: "26px",
    height: "26px",
    margin: "0 auto 18px",
    border: `3px solid ${tokens.border}`,
    borderTopColor: tokens.accent,
    borderRadius: "999px",
    animationName: spinAnim,
    animationDuration: "0.8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  h2: { margin: "0 0 6px", fontFamily: tokens.fontDisplay, fontSize: "22px", fontWeight: 700 },
  p: { margin: "0 0 22px", color: tokens.muted, fontSize: "14.5px", lineHeight: 1.5 },
});

export function StateCard({
  icon,
  spinner,
  title,
  description,
  action,
  onAction,
  ghost,
}: {
  icon?: React.ReactNode;
  spinner?: boolean;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  /** Ghost = outlined secondary action (no accent fill). */
  ghost?: boolean;
}) {
  return (
    <div {...stylex.props(styles.card)}>
      {spinner && <div {...stylex.props(styles.spinner)} />}
      {icon && !spinner && <div {...stylex.props(styles.ic)}>{icon}</div>}
      <h2 {...stylex.props(styles.h2)}>{title}</h2>
      <p {...stylex.props(styles.p)}>{description}</p>
      {action && (
        <Button
          variant={ghost ? "ghost" : "solid"}
          tone={ghost ? "muted" : "accent"}
          title={action}
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  );
}

export default StateCard;
