import React from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  list: {
    display: "grid",
    gap: "2px",
    padding: "4px 0 6px 32px",
  },
});

/** Container for expanded voice-channel participants (VoiceMember rows). */
export function VoiceMembers({
  "aria-label": ariaLabel,
  children,
}: React.PropsWithChildren<{ "aria-label"?: string }>) {
  return (
    <div {...stylex.props(styles.list)} role="list" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export default VoiceMembers;
