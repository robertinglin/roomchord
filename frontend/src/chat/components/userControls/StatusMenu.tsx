import React from "react";
import { StatusIcon } from "../Icons";

export function StatusMenu({ onSetStatus }: { onSetStatus: (status: string, activity: string) => void }) {
  return (
    <div className="status-menu" role="menu" aria-label="Set status">
      <button type="button" role="menuitem" aria-label="Set online" onClick={() => onSetStatus("online", "available")}>
        <StatusIcon status="online" />
        <span>
          <strong>Online</strong>
          <small>Available to chat</small>
        </span>
      </button>
      <button type="button" role="menuitem" aria-label="Set busy" onClick={() => onSetStatus("busy", "in a room")}>
        <StatusIcon status="busy" />
        <span>
          <strong>Busy</strong>
          <small>Limit notifications</small>
        </span>
      </button>
      <button type="button" role="menuitem" aria-label="Set away" onClick={() => onSetStatus("away", "away")}>
        <StatusIcon status="away" />
        <span>
          <strong>Away</strong>
          <small>Back later</small>
        </span>
      </button>
    </div>
  );
}
