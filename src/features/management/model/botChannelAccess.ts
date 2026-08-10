import type { Channel } from "@entities/chat/model/types";

export function botChannelAccessOverrides(memberId: string, channels: Channel[], allowedChannelIds: string[]) {
  const allowed = new Set(allowedChannelIds);
  return channels.filter((channel) => !channel.archivedAt).map((channel) => ({
    memberId,
    scopeType: channel.scopeType || "channel",
    scopeId: channel.scopeId || channel.id,
    level: allowed.has(String(channel.id)) ? "editor" as const : "none" as const,
    allowOperations: [],
    denyOperations: [],
    reason: "Bot channel allowlist"
  }));
}
