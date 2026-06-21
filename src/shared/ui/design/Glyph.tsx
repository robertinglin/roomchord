import React from "react";
import * as stylex from "@stylexjs/stylex";

const glyphStyles = stylex.create({
  ico: {
    flex: "0 0 auto",
    color: "currentColor",
    display: "inline-block",
    verticalAlign: "middle",
  },
});

/**
 * Stroke-locked icon primitive. Self-contained: sizes itself via `size` and
 * applies the 1.8px round stroke language from chat.html's `.ico` directly on
 * the <svg>. Callers hand it child <path>/<circle>/<rect> bodies — typically
 * via a named glyph from `./icons`.
 */
export function Glyph({
  children,
  size = 16,
}: React.PropsWithChildren<{ size?: number }>) {
  return (
    <svg
      {...stylex.props(glyphStyles.ico)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export default Glyph;
