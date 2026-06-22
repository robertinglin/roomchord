import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";

/**
 * The message scroll container. Structural only — styling comes from the
 * shared section shell (`chatScroll`). Keeps the `msgs` class so legacy CSS
 * and the scroll-position test mock (classList.contains("msgs")) keep working.
 */
export function MessageList({
  listRef,
  onScroll,
  "aria-label": ariaLabel,
  children,
}: React.PropsWithChildren<{
  listRef?: React.Ref<HTMLDivElement>;
  onScroll?: () => void;
  "aria-label"?: string;
}>) {
  // Merge the StyleX className with the legacy `msgs` hook so both the
  // compiled styles and the test mock (classList.contains("msgs")) apply.
  const sx = stylex.props(sectionShell.chatScroll);
  return (
    <div
      ref={listRef}
      className={`msgs ${sx.className}`}
      style={sx.style}
      role="log"
      aria-label={ariaLabel}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}

export default MessageList;
