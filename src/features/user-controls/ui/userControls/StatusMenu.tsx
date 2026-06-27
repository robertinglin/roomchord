import React from "react";
import * as stylex from "@stylexjs/stylex";
import { StatusIcon } from "@shared/ui/Icons";
import { tokens } from "../../../../shared/ui/theme.stylex";

type Status = "online" | "busy" | "away";

const styles = stylex.create({
  menu: {
    position: "fixed",
    left: "8px",
    bottom: "58px",
    zIndex: 30,
    width: "min(280px, calc(100vw - 16px))",
    display: "grid",
    gap: "4px",
    padding: "8px",
    borderRadius: tokens.radiusPanel,
    backgroundColor: tokens.surfaceDeep,
    boxShadow: tokens.elevPanel,
  },
  item: {
    minWidth: 0,
    minHeight: "44px",
    display: "grid",
    gridTemplateColumns: "14px minmax(0, 1fr)",
    gap: "10px",
    alignItems: "center",
    padding: "6px 8px",
    border: 0,
    borderRadius: tokens.radiusItem,
    color: tokens.muted,
    backgroundColor: "transparent",
    textAlign: "left",
    cursor: "pointer",
    ":hover": {
      color: tokens.fg,
      backgroundColor: tokens.panelHover,
    },
    ":focus": {
      color: tokens.fg,
      backgroundColor: tokens.panelHover,
      outline: "none",
    },
  },
  copy: {
    minWidth: 0,
    display: "grid",
  },
  label: {
    fontSize: "13px",
  },
  hint: {
    color: tokens.quiet,
    fontSize: "12px",
  },
  icon: {
    width: "12px",
    height: "12px",
  },
  online: {
    color: tokens.success,
  },
  busy: {
    color: tokens.danger,
  },
  away: {
    color: tokens.warning,
  },
  iconShape: {
    fill: "currentColor",
  },
});

function statusIconStyle(status: Status) {
  if (status === "online") return styles.online;
  if (status === "busy") return styles.busy;
  return styles.away;
}

export function StatusMenu({ onSetStatus }: { onSetStatus: (status: string, activity: string) => void }) {
  const options: Array<{ activity: string; hint: string; label: string; status: Status }> = [
    { activity: "available", hint: "Available to chat", label: "Online", status: "online" },
    { activity: "in a room", hint: "Limit notifications", label: "Busy", status: "busy" },
    { activity: "away", hint: "Back later", label: "Away", status: "away" },
  ];

  return (
    <div {...stylex.props(styles.menu)} role="menu" aria-label="Set status">
      {options.map((option) => (
        <button
          {...stylex.props(styles.item)}
          type="button"
          role="menuitem"
          aria-label={`Set ${option.status}`}
          onClick={() => onSetStatus(option.status, option.activity)}
          key={option.status}
        >
          <StatusIcon {...stylex.props(styles.icon, styles.iconShape, statusIconStyle(option.status))} status={option.status} />
          <span {...stylex.props(styles.copy)}>
            <strong {...stylex.props(styles.label)}>{option.label}</strong>
            <small {...stylex.props(styles.hint)}>{option.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
