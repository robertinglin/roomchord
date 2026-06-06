import React from "react";
import type { ManagementTab } from "@entities/chat/model/managementTypes";

export function ManageOverviewTab({
  channelCount,
  memberCount,
  roleCount,
  roomCount,
  onSelectTab
}: {
  channelCount: number;
  memberCount: number;
  roleCount: number;
  roomCount: number;
  onSelectTab: (tab: ManagementTab) => void;
}) {
  return (
    <div className="manage-overview-grid">
      <button type="button" className="manage-overview-item" onClick={() => onSelectTab("channels")}>
        <strong>{channelCount}</strong>
        <span>Active channels</span>
      </button>
      <button type="button" className="manage-overview-item" onClick={() => onSelectTab("voice")}>
        <strong>{roomCount}</strong>
        <span>Voice channels</span>
      </button>
      <button type="button" className="manage-overview-item" onClick={() => onSelectTab("roles")}>
        <strong>{roleCount}</strong>
        <span>Role tags</span>
      </button>
      <button type="button" className="manage-overview-item" onClick={() => onSelectTab("members")}>
        <strong>{memberCount}</strong>
        <span>Members</span>
      </button>
    </div>
  );
}
