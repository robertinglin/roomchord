import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { ChevronGlyph, PlusGlyph } from "./icons";
import { Button } from "./Button";

const styles = stylex.create({
  head: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "0 8px 6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tokens.quiet,
  },
  // The whole heading is a button when onToggle is provided (so the label
  // collapses/expands its group); otherwise it's a static row.
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
    minWidth: 0,
    border: 0,
    background: "transparent",
    color: "inherit",
    font: "inherit",
    textTransform: "inherit",
    letterSpacing: "inherit",
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  },
  label: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chev: {
    color: tokens.quiet,
    flex: "0 0 auto",
    transition: "transform 160ms ease",
    transform: "rotate(0deg)",
    display: "inline-flex",
  },
  chevOpen: { transform: "rotate(90deg)" },
});

export function GroupHeading({
  label,
  open = true,
  onAdd,
  onToggle,
}: {
  label: string;
  open?: boolean;
  onAdd?: () => void;
  onToggle?: () => void;
}) {
  const chev = (
    <span {...stylex.props(styles.chev, open && styles.chevOpen)}>
      <ChevronGlyph size={12} />
    </span>
  );
  const labelEl = <span {...stylex.props(styles.label)}>{label}</span>;

  return (
    <div {...stylex.props(styles.head)}>
      {onToggle ? (
        <button
          {...stylex.props(styles.toggle)}
          type="button"
          aria-expanded={open}
          onClick={onToggle}
        >
          {chev}
          {labelEl}
        </button>
      ) : (
        <>
          {chev}
          {labelEl}
        </>
      )}
      {onAdd && (
        <Button size="sm" tone="quiet" title="Create channel" onClick={onAdd}>
          <PlusGlyph size={14} />
        </Button>
      )}
    </div>
  );
}

export default GroupHeading;
