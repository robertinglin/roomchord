import { buildHashRoute, hashPath, hashSearchParams } from "roomkit-sdk/browser/hashRoute";
import { roomSearchParamsWithoutConfig } from "roomkit-sdk/browser/roomLink";

const MESSAGE_HASH_PREFIX = "message-";
const MESSAGE_QUERY_PARAM = "messageId";
const NOTIFY_CHANNEL_PARAM = "notifyChannel";
const NOTIFY_DM_PARAM = "notifyDm";

const ROOM_DEEP_LINK_PREFIXES = ["/room/", "/roomkit/launch/", "/roomkit/invite/"];

function currentRoomDeepLinkPath() {
  const path = hashPath();
  return ROOM_DEEP_LINK_PREFIXES.some((prefix) => path.startsWith(prefix)) ? path : undefined;
}

function absoluteHashHref(hashRoute: string) {
  if (typeof window === "undefined") return hashRoute;
  const url = new URL(window.location.href);
  url.hash = hashRoute.startsWith("#") ? hashRoute.slice(1) : hashRoute;
  return url.toString();
}

export type NotificationTarget = { channelId: string } | { dmMemberId: string };

export function messageAnchorId(messageId: string) {
  return `${MESSAGE_HASH_PREFIX}${messageId}`;
}

export function messageHref(messageId: string) {
  if (typeof window !== "undefined") {
    const path = hashPath();
    if (path.startsWith("/room/")) {
      const params = roomSearchParamsWithoutConfig(hashSearchParams());
      params.set(MESSAGE_QUERY_PARAM, messageId);
      return buildHashRoute(path, params);
    }
  }
  return `#${encodeURIComponent(messageAnchorId(messageId))}`;
}

// Builds the deep link baked into a push notification. Mirrors messageHref:
// we reuse the recipient-shared room route and strip room config so the link is
// safe to embed. Returns undefined when we are not on a room route (the SDK then
// falls back to its default hash link).
export function notificationHref(target: NotificationTarget): string | undefined {
  if (typeof window === "undefined") return undefined;
  const path = currentRoomDeepLinkPath();
  if (!path) return undefined;
  const params = roomSearchParamsWithoutConfig(hashSearchParams());
  if ("channelId" in target) params.set(NOTIFY_CHANNEL_PARAM, target.channelId);
  else params.set(NOTIFY_DM_PARAM, target.dmMemberId);
  return absoluteHashHref(buildHashRoute(path, params));
}

export function notificationTargetFromHash(hash?: string): NotificationTarget | undefined {
  const params = hashSearchParams(hash);
  const channelId = params.get(NOTIFY_CHANNEL_PARAM);
  if (channelId) return { channelId };
  const dmMemberId = params.get(NOTIFY_DM_PARAM);
  if (dmMemberId) return { dmMemberId };
  return undefined;
}

export function messageIdFromHash(hash: string) {
  const params = hashSearchParams(hash);
  const linkedMessage = params.get(MESSAGE_QUERY_PARAM);
  if (linkedMessage) return linkedMessage;

  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!value.startsWith(MESSAGE_HASH_PREFIX)) return undefined;
  try {
    return decodeURIComponent(value.slice(MESSAGE_HASH_PREFIX.length));
  } catch {
    return value.slice(MESSAGE_HASH_PREFIX.length);
  }
}
