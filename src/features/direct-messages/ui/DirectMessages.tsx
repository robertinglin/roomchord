import React from "react";
import type { DirectThread } from "@entities/chat/model/types";
import { threadAvatar, threadTitle } from "@entities/chat/model/directThreads";
import { Badge, ChannelGroup, DirectMessageRow } from "@shared/ui/design";

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
    <ChannelGroup label="Direct Messages">
      {threads.length === 0 ? null : threads.map((thread) => {
        const title = threadTitle(thread, memberNamesById, currentUserId);
        const unread = unreadCounts[thread.id] || 0;
        return (
          <DirectMessageRow
            key={thread.id}
            avatar={threadAvatar(thread, memberAvatarsById, currentUserId)}
            name={title}
            active={thread.id === activeThreadId}
            badge={unread > 0 ? <Badge count={unread} /> : undefined}
            onClose={() => onClose(thread.id)}
            onClick={() => onSelect(thread.id)}
            aria-label={unread > 0 ? `${title}, ${unread} unread DM${unread === 1 ? "" : "s"}` : title}
          />
        );
      })}
    </ChannelGroup>
  );
}
