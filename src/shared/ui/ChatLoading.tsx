import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "./theme.stylex";

const styles = stylex.create({
  shell: {
    minHeight: "100svh",
    height: "100svh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    color: tokens.fg,
    backgroundColor: tokens.bg,
  },
  panel: {
    width: "min(420px, 100%)",
    padding: "24px",
    border: `1px solid ${tokens.border}`,
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surface,
    boxShadow: tokens.elevPanel,
  },
  status: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "22px",
    padding: "0 8px",
    borderRadius: "999px",
    backgroundColor: tokens.panelActive,
    color: tokens.muted,
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  connected: {
    color: tokens.success,
  },
  error: {
    color: tokens.danger,
  },
  pending: {
    color: tokens.warning,
  },
  title: {
    margin: "16px 0 6px",
    fontSize: "20px",
    letterSpacing: 0,
  },
  copy: {
    margin: "6px 0 0",
    color: tokens.muted,
  },
});

export function ChatLoading(props: { roomName: string; message: string; status: string }) {
  const statusStyle = props.status === "connected"
    ? styles.connected
    : props.status === "error" || props.status === "offline"
      ? styles.error
      : styles.pending;

  return (
    <main {...stylex.props(styles.shell)}>
      <section {...stylex.props(styles.panel)} aria-live="polite">
        <span {...stylex.props(styles.status, statusStyle)}>{props.status}</span>
        <h1 {...stylex.props(styles.title)}>Mosh</h1>
        <p {...stylex.props(styles.copy)}>{props.roomName}</p>
        <p {...stylex.props(styles.copy)}>{props.message}</p>
      </section>
    </main>
  );
}
