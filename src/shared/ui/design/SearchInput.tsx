import React from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../theme.stylex";
import { SearchGlyph } from "./icons";

const styles = stylex.create({
  wrap: { position: "relative", marginBottom: "14px" },
  glyph: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: tokens.quiet,
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    height: "34px",
    padding: "0 12px 0 32px",
    borderRadius: tokens.radiusItem,
    backgroundColor: tokens.fieldBg,
    border: "1px solid transparent",
    color: tokens.fg,
    outline: "none",
    ":focus": { borderColor: tokens.accent },
    "::placeholder": { color: tokens.quiet },
  },
});

export function SearchInput({ className, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div {...stylex.props(styles.wrap)} className={className} style={style}>
      <span {...stylex.props(styles.glyph)}>
        <SearchGlyph size={14} />
      </span>
      <input {...stylex.props(styles.input)} type="text" {...rest} />
    </div>
  );
}

export default SearchInput;
