import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";

/** Right rail — owns only the column shell; children are RailGroup atoms. */
export function MemberRail({ children }: React.PropsWithChildren) {
  return <aside {...stylex.props(sectionShell.rail)}>{children}</aside>;
}

export default MemberRail;
