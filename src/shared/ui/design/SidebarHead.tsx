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
  },
  title: { minWidth: 0, flex: 1 },
  h1: {
    margin: 0,
    fontFamily: tokens.fontDisplay,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: tokens.muted,
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
});

export function SidebarHead({
  appName,
  statusLabel,
  tone,
  showPill = true,
}: {
  appName: string;
  statusLabel: string;
  tone: DotTone;
  showPill?: boolean;
}) {
  return (
    <div {...stylex.props(styles.head)}>
      <Wordmark />
      <div {...stylex.props(styles.title)}>
        <h1 {...stylex.props(styles.h1)}>{appName}</h1>
        <p {...stylex.props(styles.subtitle)}>
          <StatusDot tone={tone} />
          <span>{statusLabel}</span>
        </p>
      </div>
      {showPill && <ConnPill tone={tone} label="Live" />}
    </div>
  );
}

export default SidebarHead;
