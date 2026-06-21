import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { Button } from "./Button";
import { MicGlyph, LeaveGlyph } from "./icons";

const styles = stylex.create({
  stage: {
    position: "absolute",
    inset: 0,
    display: "none",
    flexDirection: "column",
    backgroundColor: tokens.bg,
    zIndex: 20,
  },
  show: { display: "flex" },
  head: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "13px 16px",
    borderBottom: "1px solid oklch(0.11 0.006 250 / 0.72)",
  },
  ic: { color: tokens.success, flex: "0 0 auto", display: "inline-flex" },
  title: { margin: 0, fontFamily: tokens.fontDisplay, fontSize: "16px", fontWeight: 700 },
  sub: { fontSize: "13px", color: tokens.quiet },
  grid: {
    flex: 1,
    overflowY: "auto",
    padding: "18px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: "14px",
    alignContent: "start",
  },
  ctrls: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid oklch(0.11 0.006 250 / 0.72)",
    backgroundColor: tokens.surface,
  },
});

export function VoiceStage({
  show,
  title,
  subtitle,
  onLeave,
  children,
  controls,
}: React.PropsWithChildren<{
  show: boolean;
  title: string;
  subtitle: string;
  onLeave: () => void;
  controls: React.ReactNode;
}>) {
  return (
    <div {...stylex.props(styles.stage, show && styles.show)}>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.ic)}>
          <MicGlyph size={16} />
        </span>
        <h2 {...stylex.props(styles.title)}>{title}</h2>
        <span {...stylex.props(styles.sub)}>{subtitle}</span>
        <Button variant="solid" tone="danger" title="Leave" onClick={onLeave}>
          <LeaveGlyph size={15} />
          Leave
        </Button>
      </div>
      <div {...stylex.props(styles.grid)}>{children}</div>
      <div {...stylex.props(styles.ctrls)}>{controls}</div>
    </div>
  );
}

export default VoiceStage;
