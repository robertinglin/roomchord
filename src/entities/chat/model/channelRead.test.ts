import { afterEach, describe, expect, it, vi } from "vitest";
import { latestChannelReadCursor, markChannelRead, markReadTag } from "./channelRead";

afterEach(() => vi.restoreAllMocks());

describe("chat read cursors", () => {
  it("selects the latest non-deleted channel message with a stable tie-breaker", () => {
    expect(latestChannelReadCursor([
      { id: "old", channelId: "general", createdAt: 10 },
      { id: "deleted", channelId: "general", createdAt: 30, deletedAt: 1 },
      { id: "b", channelId: "general", createdAt: 20 },
      { id: "a", channelId: "general", createdAt: 20 },
      { id: "other", channelId: "random", createdAt: 40 }
    ], "general")).toEqual({ createdAt: 20, operationId: "b" });
    expect(latestChannelReadCursor([{ channelId: "general", createdAt: 40 }], "general")).toBeUndefined();
  });

  it("publishes visible chat messages as room read-tag operations", async () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(1234);
    await markChannelRead({ dispatch }, [{ id: "message-1", channelId: "general", createdAt: 42 }], "general");
    expect(dispatch).toHaveBeenCalledWith("read.tag.set", {
      scopeType: "channel",
      scopeId: "general",
      operationId: "message-1",
      messageId: "message-1",
      readAt: 1234
    });
  });

  it("does not send a missing or already-applied cursor", () => {
    const dispatch = vi.fn().mockResolvedValue(undefined);
    expect(markChannelRead({ dispatch }, [], "general")).toBeUndefined();
    expect(markReadTag(undefined, "direct.thread", "thread-1", { createdAt: 1, operationId: "message-1" })).toBeUndefined();
    expect(markReadTag({ dispatch }, "direct.thread", "thread-1", { createdAt: 1, operationId: "message-1" }, { messageId: "message-1" })).toBeUndefined();
    expect(markReadTag({ dispatch }, "direct.thread", "thread-1", { createdAt: 1, operationId: "message-1" }, { operationId: "message-1" })).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("deduplicates the same read cursor while its dispatch is in flight", async () => {
    const pendingDispatches: Array<() => void> = [];
    const dispatch = vi.fn(() => new Promise<void>((resolve) => { pendingDispatches.push(resolve); }));
    const dispatcher = { dispatch };
    const cursor = { createdAt: 10, operationId: "message-1" };
    const first = markReadTag(dispatcher, "channel", "general", cursor);
    const duplicate = markReadTag(dispatcher, "channel", "general", cursor);
    const otherScope = markReadTag(dispatcher, "channel", "random", cursor);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(duplicate).toBeUndefined();

    pendingDispatches.forEach((resolve) => resolve());
    await Promise.all([first, otherScope]);
    const retry = markReadTag(dispatcher, "channel", "general", cursor);
    expect(dispatch).toHaveBeenCalledTimes(3);
    pendingDispatches.at(-1)?.();
    await retry;
  });
});
