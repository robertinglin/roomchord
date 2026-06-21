import React from "react";
import type { DirectThread } from "@entities/chat/model/types";
import { threadAvatar, threadTitle } from "@entities/chat/model/directThreads";
import { Avatar } from "@shared/ui/Avatar";
import { DirectMessageIcon } from "@shared/ui/Icons";

export function DirectMessages({
  threads,
  activeThreadId,
  currentUserId,
  memberNamesById,
  memberAvatarsById,
  unreadCounts,
  onSelect,
  onClose
}: {
  threads: DirectThread[];
  activeThreadId?: string;
  currentUserId?: string;
  memberNamesById: Record<string, string>;
  memberAvatarsById: Record<string, string>;
  unreadCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <section className="sidebar-section dm-section" aria-labelledby="dm-heading">
      <div className="dm-section-heading">
        <h2 id="dm-heading">
          <DirectMessageIcon className="ui-icon dm-heading-icon" />
          <span>DMs</span>
        </h2>
      </div>
      <div className="sidebar-list">
        {threads.length === 0 ? <p className="sidebar-empty">No DMs</p> : null}
        {threads.map((thread) => {
          const title = threadTitle(thread, memberNamesById, currentUserId);
          const unread = unreadCounts[thread.id] || 0;
          return (
            <div className={`dm-row${thread.id === activeThreadId ? " active" : ""}`} key={thread.id}>
              <button
                className={`sidebar-item dm-button${thread.id === activeThreadId ? " active" : ""}`}
                type="button"
                aria-label={unread > 0 ? `${title}, ${unread} unread DM${unread === 1 ? "" : "s"}` : title}
                onClick={() => onSelect(thread.id)}
              >
                <Avatar name={title} avatar={threadAvatar(thread, memberAvatarsById, currentUserId)} small />
                <span className="dm-name">{title}</span>
                {unread > 0 ? <span className="unread-badge" aria-hidden="true">{unread}</span> : null}
              </button>
              <button
                className="dm-close-button"
                type="button"
                aria-label={`Close ${title} DM`}
                onClick={() => onClose(thread.id)}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
