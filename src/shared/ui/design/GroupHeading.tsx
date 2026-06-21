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
  },
  chevOpen: { transform: "rotate(90deg)" },
});

export function GroupHeading({
  label,
  open = true,
  onAdd,
}: {
  label: string;
  open?: boolean;
  onAdd?: () => void;
}) {
  return (
    <div {...stylex.props(styles.head)}>
      <span {...stylex.props(styles.chev, open && styles.chevOpen)}>
        <ChevronGlyph size={12} />
      </span>
      <span {...stylex.props(styles.label)}>{label}</span>
      {onAdd && (
        <Button size="sm" tone="quiet" title="Create channel" onClick={onAdd}>
          <PlusGlyph size={14} />
        </Button>
      )}
    </div>
  );
}

export default GroupHeading;

