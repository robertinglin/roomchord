import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";
import { SidebarHead } from "./SidebarHead";
import { SearchInput } from "./SearchInput";
import type { DotTone } from "./StatusDot";

/**
 * Full left column, composed entirely of atoms. Owns only the column shell
 * (flex column + surface bg + right border) and the scroll body padding.
 */
export function Sidebar({
  appName,
  statusLabel,
  tone,
  searchPlaceholder,
  groups,
  user,
}: {
  appName: string;
  statusLabel: string;
  tone: DotTone;
  searchPlaceholder?: string;
  groups: React.ReactNode;
  user: React.ReactNode;
}) {
  return (
    <aside {...stylex.props(sectionShell.sidebar)}>
      <SidebarHead appName={appName} statusLabel={statusLabel} tone={tone} />
      <div {...stylex.props(sectionShell.sidebarScroll)}>
        <SearchInput placeholder={searchPlaceholder} />
        {groups}
      </div>
      {user}
    </aside>
  );
}

export default Sidebar;
