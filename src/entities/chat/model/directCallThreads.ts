import type { DirectCallState } from "matterhorn-sdk/browser/types";
import { directThreadIdForUsers } from "@entities/chat/model/state";
import type { DirectThread, MemberId, ThreadId } from "@entities/chat/model/types";

export type DirectCallThreadPresence = {
  held?: boolean;
  label: string;
  status: DirectCallState["status"];
};

function remoteMemberIds(memberIds: string[], currentUserId?: string) {
  return Array.from(new Set(memberIds.filter((id) => id && id !== currentUserId))).sort();
}

export function directCallThreadForMembers(currentUserId: string | undefined, memberIds: string[]): DirectThread | undefined {
  if (!currentUserId) return undefined;
  const remotes = remoteMemberIds(memberIds, currentUserId);
  if (!remotes.length) return undefined;
  const userIds = [currentUserId, ...remotes].sort() as MemberId[];
  return {
    id: directThreadIdForUsers(userIds) as ThreadId,
    userIds,
    topic: null,
    createdAt: 0,
    archivedAt: null,
  } as DirectThread;
}

export function directCallMatchesThread(thread: DirectThread, currentUserId: string | undefined, memberIds: string[]) {
  const threadRemotes = remoteMemberIds(thread.userIds || [], currentUserId);
  const callRemotes = remoteMemberIds(memberIds, currentUserId);
  return threadRemotes.length > 0
    && threadRemotes.length === callRemotes.length
    && threadRemotes.every((id, index) => id === callRemotes[index]);
}

export function directCallPresenceLabel(status: DirectCallState["status"], held = false) {
  if (held) return "On hold";
  if (status === "incoming") return "Incoming call";
  if (status === "outgoing") return "Calling";
  if (status === "connecting") return "Connecting";
  if (status === "connected") return "In call";
  return "";
}

export function directCallCanRenderRoom(status: DirectCallState["status"]) {
  return status === "outgoing" || status === "connecting" || status === "connected";
}
