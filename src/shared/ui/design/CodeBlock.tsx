import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";

const styles = stylex.create({
  block: {
    marginTop: "6px",
    borderRadius: tokens.radiusItem,
    overflow: "hidden",
    backgroundColor: tokens.surfaceDeep,
    border: `1px solid ${tokens.borderSoft}`,
    maxWidth: "520px",
  },
  head: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "7px 12px",
    backgroundColor: "oklch(0.17 0.007 250)",
    fontSize: "11px",
    color: tokens.quiet,
    fontFamily: tokens.fontMono,
  },
  filename: {},
  copyBtn: {
    fontSize: "11px",
    color: tokens.quiet,
    border: 0,
    background: "transparent",
    cursor: "pointer",
    ":hover": { color: tokens.fg },
  },
  body: {
    padding: "11px 13px",
    fontFamily: tokens.fontMono,
    fontSize: "13px",
    lineHeight: 1.6,
    color: "oklch(0.86 0.01 250)",
    overflowX: "auto",
    whiteSpace: "pre",
  },
  // syntax-highlight token classes — wrap spans in the body with these
  k: { color: "oklch(0.78 0.11 290)" },
  s: { color: "oklch(0.78 0.11 155)" },
  c: { color: tokens.quiet },
});

export function CodeBlock({
  filename,
  code,
}: {
  filename: string;
  code: React.ReactNode;
}) {
  return (
    <div {...stylex.props(styles.block)}>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.filename)}>{filename}</span>
        <button {...stylex.props(styles.copyBtn)} type="button">
          Copy
        </button>
      </div>
      <div {...stylex.props(styles.body)}>{code}</div>
    </div>
  );
}

/** Syntax-highlight token styles — apply to <span> children of `code`. */
export const codeTokens = {
  k: styles.k,
  s: styles.s,
  c: styles.c,
};

export default CodeBlock;
