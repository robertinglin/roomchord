import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";

/**
 * Center column: header + banner + messages + typing + composer + voice/
 * loading overlays. Owns only the column shell and the message-scroll body.
 * All content is atoms passed in as props.
 */
export function ChatColumn({
  header,
  banner,
  messages,
  empty,
  typing,
  composer,
  voiceOverlay,
  loadingOverlay,
}: {
  header: React.ReactNode;
  banner?: React.ReactNode;
  messages?: React.ReactNode;
  empty?: React.ReactNode;
  typing?: React.ReactNode;
  composer?: React.ReactNode;
  voiceOverlay?: React.ReactNode;
  loadingOverlay?: React.ReactNode;
}) {
  return (
    <main {...stylex.props(sectionShell.chat)}>
      {header}
      {banner}
      {empty ?? <div {...stylex.props(sectionShell.chatScroll)}>{messages}</div>}
      {typing}
      {composer}
      {voiceOverlay}
      {loadingOverlay}
    </main>
  );
}

export default ChatColumn;
