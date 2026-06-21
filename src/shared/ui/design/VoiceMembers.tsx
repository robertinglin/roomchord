import React from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  list: { display: "grid", gap: "3px", padding: "3px 0 4px 28px" },
});

/** Container for expanded voice-channel participants (VoiceMember rows). */
export function VoiceMembers({ children }: React.PropsWithChildren) {
  return <div {...stylex.props(styles.list)}>{children}</div>;
}

export default VoiceMembers;
