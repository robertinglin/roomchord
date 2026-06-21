import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";

/**
 * The three-column app grid (272 / 1fr / 304). The only composed style of
 * consequence; children are the three sections (Sidebar, ChatColumn, Rail).
 */
export function AppShell({ children }: React.PropsWithChildren) {
  return <div {...stylex.props(sectionShell.shell)}>{children}</div>;
}

export default AppShell;
