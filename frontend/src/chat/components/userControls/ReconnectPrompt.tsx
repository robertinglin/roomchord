import React from "react";
import type { MediaRoom } from "../../types";

export function ReconnectPrompt({
  room,
  onDismiss,
  onReconnect
}: {
  room: MediaRoom;
  onDismiss: () => void;
  onReconnect: (room: MediaRoom) => void;
}) {
  return (
    <section className="voice-reconnect-panel" aria-label="Voice reconnect prompt">
      <span>
        <strong>Reconnect to {room.name}?</strong>
        <small>Recent voice session</small>
      </span>
      <span className="voice-reconnect-actions">
        <button type="button" className="secondary-action" onClick={() => onReconnect(room)}>
          Reconnect
        </button>
        <button type="button" className="ghost-action" onClick={onDismiss}>
          Dismiss
        </button>
      </span>
    </section>
  );
}
