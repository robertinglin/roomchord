import React from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@shared/ui/design";
import { tokens } from "./theme.stylex";

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 2147482000,
    display: "grid",
    placeItems: "center",
    padding: "18px",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  dialog: {
    width: "min(420px, 100%)",
    display: "grid",
    gap: "14px",
    padding: "18px",
    border: `1px solid ${tokens.borderSoft}`,
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    boxShadow: tokens.elevCtrl,
    color: tokens.fg,
  },
  copy: { display: "grid", gap: "6px" },
  title: { margin: 0, fontSize: "16px", lineHeight: 1.25 },
  text: { margin: 0, color: tokens.muted, fontSize: "13px", lineHeight: 1.45 },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "8px",
  },
});

type Props = {
  currentLabel: string;
  targetLabel: string;
  onCancel: () => void;
  onEnd: () => void;
  onHold: () => void;
};

export function CallSwitchDialog({ currentLabel, targetLabel, onCancel, onEnd, onHold }: Props) {
  return (
    <div {...stylex.props(styles.backdrop)} role="presentation">
      <section {...stylex.props(styles.dialog)} aria-modal="true" role="dialog" aria-labelledby="call-switch-title">
        <div {...stylex.props(styles.copy)}>
          <h2 id="call-switch-title" {...stylex.props(styles.title)}>Switch calls?</h2>
          <p {...stylex.props(styles.text)}>
            Hold {currentLabel} to join {targetLabel}, or end the current call first.
          </p>
        </div>
        <div {...stylex.props(styles.actions)}>
          <Button tone="muted" variant="etched" onClick={onCancel}>Cancel</Button>
          <Button tone="danger" variant="solid" onClick={onEnd}>End</Button>
          <Button tone="accent" variant="solid" onClick={onHold}>Hold</Button>
        </div>
      </section>
    </div>
  );
}
