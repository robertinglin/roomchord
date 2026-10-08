export type ChatReadCursor = { createdAt: number; operationId: string };
export type CurrentReadTag = { messageId?: string; operationId?: string };

type ReadTagDispatcher = {
  dispatch: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

type ReadableChannelMessage = {
  id?: string;
  channelId?: string;
  createdAt?: number;
  deletedAt?: number | null;
};

const pendingReadTags = new WeakMap<ReadTagDispatcher, Set<string>>();

export function latestChannelReadCursor(messages: ReadableChannelMessage[], channelId: string): ChatReadCursor | undefined {
  const latest = messages
    .filter((message) => message.channelId === channelId && !message.deletedAt)
    .reduce<ReadableChannelMessage | undefined>((current, message) => {
      if (!current) return message;
      const currentAt = Number(current.createdAt || 0);
      const messageAt = Number(message.createdAt || 0);
      return messageAt > currentAt || messageAt === currentAt && String(message.id || "") > String(current.id || "")
        ? message
        : current;
    }, undefined);
  if (!latest?.id) return undefined;
  return { createdAt: Number(latest.createdAt || 0), operationId: String(latest.id) };
}

export function markReadTag(
  dispatcher: ReadTagDispatcher | undefined,
  scopeType: string,
  scopeId: string,
  cursor: ChatReadCursor | undefined,
  currentReadTag?: CurrentReadTag
): Promise<unknown> | undefined {
  if (!dispatcher || !cursor) return undefined;
  if (currentReadTag?.messageId === cursor.operationId || currentReadTag?.operationId === cursor.operationId) return undefined;

  const pendingForDispatch = pendingReadTags.get(dispatcher) || new Set<string>();
  const cursorKey = JSON.stringify([scopeType, scopeId, cursor.operationId]);
  if (pendingForDispatch.has(cursorKey)) return undefined;

  pendingForDispatch.add(cursorKey);
  pendingReadTags.set(dispatcher, pendingForDispatch);
  const release = () => {
    pendingForDispatch.delete(cursorKey);
    if (pendingForDispatch.size === 0) pendingReadTags.delete(dispatcher);
  };
  let request: Promise<unknown>;
  try {
    request = dispatcher.dispatch("read.tag.set", {
      scopeType,
      scopeId,
      operationId: cursor.operationId,
      messageId: cursor.operationId,
      readAt: Date.now()
    });
  } catch (error) {
    release();
    throw error;
  }
  return request.finally(release);
}

export function markChannelRead(
  dispatcher: ReadTagDispatcher | undefined,
  messages: ReadableChannelMessage[],
  channelId: string,
  currentReadTag?: CurrentReadTag
): Promise<unknown> | undefined {
  return markReadTag(dispatcher, "channel", channelId, latestChannelReadCursor(messages, channelId), currentReadTag);
}
