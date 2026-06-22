import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";

/** Right rail — owns only the column shell; children are RailGroup atoms. */
export function MemberRail({ children }: React.PropsWithChildren) {
  const rail = stylex.props(sectionShell.rail);
  return <aside className={`rail ${rail.className}`} style={rail.style}>{children}</aside>;
}

export default MemberRail;
