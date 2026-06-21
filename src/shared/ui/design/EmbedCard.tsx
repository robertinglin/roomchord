import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  card: {
    marginTop: "6px",
    borderRadius: tokens.radiusItem,
    overflow: "hidden",
    maxWidth: "420px",
    backgroundColor: tokens.surface,
    border: `1px solid ${tokens.borderSoft}`,
    boxShadow: tokens.elevCtrl,
  },
  bar: { height: "3px", backgroundColor: tokens.accent },
  img: {
    height: "130px",
    background: "linear-gradient(135deg,oklch(0.28 0.02 250),oklch(0.22 0.04 290))",
    display: "grid",
    placeItems: "center",
    color: tokens.quiet,
  },
  body: { padding: "11px 13px" },
  site: { fontSize: "11px", color: tokens.quiet },
  title: { fontSize: "15px", fontWeight: 600, margin: "2px 0 4px", color: tokens.fg },
  desc: { fontSize: "13px", color: tokens.muted, lineHeight: 1.4 },
});

export function EmbedCard({
  site,
  title,
  description,
  preview,
}: {
  site: string;
  title: string;
  description: string;
  preview?: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.bar)} />
      <div {...stylex.props(styles.img)}>{preview}</div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.site)}>{site}</div>
        <div {...stylex.props(styles.title)}>{title}</div>
        <div {...stylex.props(styles.desc)}>{description}</div>
      </div>
    </div>
  );
}

export default EmbedCard;
