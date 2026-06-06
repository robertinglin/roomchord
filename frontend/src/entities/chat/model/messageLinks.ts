import { buildHashRoute, hashPath, hashSearchParams } from "roomkit-sdk/browser/hashRoute";
import { roomSearchParamsWithoutConfig } from "roomkit-sdk/browser/roomLink";

const MESSAGE_HASH_PREFIX = "message-";
const MESSAGE_QUERY_PARAM = "messageId";

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
