import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Wordmark } from "./Wordmark";
import { StatusDot, type DotTone } from "./StatusDot";
import { ConnPill } from "./ConnPill";

const styles = stylex.create({
  head: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    borderBottom: "1px solid oklch(0.11 0.006 250 / 0.72)",
    flex: "0 0 auto",
    "@media (min-width: 600px) and (max-width: 1024px)": {
      padding: "12px",
      gap: "10px",
    },
  },
  title: { minWidth: 0, flex: 1 },
  h1: {
    margin: 0,
    fontFamily: tokens.fontDisplay,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: 0,
    "@media (min-width: 600px) and (max-width: 1024px)": {
      fontSize: "15px",
    },
  },
  subtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: tokens.muted,
    display: "flex",
    alignItems: "center",
    gap: "5px",
    "@media (min-width: 600px) and (max-width: 1024px)": {
      fontSize: "11.5px",
    },
  },
  actions: { display: "flex", alignItems: "center", gap: "4px", flex: "0 0 auto" },
  visuallyHidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
});

/**
 * Sidebar header. Renders the default Wordmark + status + ConnPill, OR — when
 * `homeButton` is provided — the live app's launch-home button in place of
 * the wordmark, plus optional `manageButton`/`closeButton` action slots.
 */
export function SidebarHead({
  appName,
  statusLabel,
  tone,
  showPill = true,
  homeButton,
  manageButton,
  closeButton,
}: {
  appName: string;
  statusLabel: string;
  tone: DotTone;
  showPill?: boolean;
  homeButton?: React.ReactNode;
  manageButton?: React.ReactNode;
  closeButton?: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.head)}>
      {closeButton}
      {homeButton ?? <Wordmark />}
      <div {...stylex.props(styles.title)}>
        <h1 {...stylex.props(styles.h1)}>{appName}</h1>
        <p {...stylex.props(styles.subtitle)}>
          <StatusDot tone={tone} />
          <span {...stylex.props(styles.visuallyHidden)}>{tone}</span>
          <span>{statusLabel}</span>
        </p>
      </div>
      {(manageButton || showPill) && (
        <span {...stylex.props(styles.actions)}>
          {showPill ? <ConnPill tone={tone} label="Live" /> : null}
          {manageButton}
        </span>
      )}
    </div>
  );
}

export default SidebarHead;
