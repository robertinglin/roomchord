import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sectionShell } from "./sectionShell";
import { SidebarHead } from "./SidebarHead";
import { SearchInput } from "./SearchInput";
import type { DotTone } from "./StatusDot";

/**
 * Full left column, composed entirely of atoms. Owns only the column shell
 * (flex column + surface bg + right border) and the scroll body padding.
 *
 * Optional header slots let the live app inject the MtnHome launch-home
 * button, a role-gated manage button, and a mobile close button; when all
 * are omitted the demo head (Wordmark + status + ConnPill) is used.
 */
export function Sidebar({
  appName,
  statusLabel,
  tone,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  showSearch = true,
  showPill = true,
  homeButton,
  manageButton,
  closeButton,
  open,
  groups,
  user,
}: {
  appName: string;
  statusLabel: string;
  tone: DotTone;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  showPill?: boolean;
  homeButton?: React.ReactNode;
  manageButton?: React.ReactNode;
  closeButton?: React.ReactNode;
  open?: boolean;
  groups: React.ReactNode;
  user: React.ReactNode;
}) {
  const sidebar = stylex.props(sectionShell.sidebar, open && sectionShell.sidebarOpen);
  const scroll = stylex.props(sectionShell.sidebarScroll);
  return (
    <aside className={sidebar.className} style={sidebar.style} aria-label="Room navigation">
      <SidebarHead
        appName={appName}
        statusLabel={statusLabel}
        tone={tone}
        showPill={showPill}
        homeButton={homeButton}
        manageButton={manageButton}
        closeButton={closeButton}
      />
      {showSearch && (
        <div className={scroll.className} style={scroll.style}>
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          {groups}
        </div>
      )}
      {!showSearch && <div className={scroll.className} style={scroll.style}>{groups}</div>}
      {user}
    </aside>
  );
}

export default Sidebar;
