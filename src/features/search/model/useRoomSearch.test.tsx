import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRoomSearch } from "@features/search/model/useRoomSearch";

function liveFixture(searchRoom = vi.fn()) {
  return { searchRoom } as any;
}

describe("useRoomSearch", () => {
  it("dispatches an authorized channel search and exposes records", async () => {
    const searchRoom = vi.fn().mockResolvedValue({
      events: [{ id: "event-1" }],
      matches: [{ eventId: "event-1", score: 1, matchedTokens: 1, queryTokenCount: 1 }],
      records: [{ id: "message-1", body: "hello" }],
      total: 1,
      queryTokenCount: 1
    });
    const live = liveFixture(searchRoom);
    const { result } = renderHook(() => useRoomSearch(live, { query: "hello", scope: "messages", limit: 10, offset: 0 }, "general"));
    await waitFor(() => expect(result.current.result?.records).toEqual([{ id: "message-1", body: "hello" }]));
    expect(searchRoom).toHaveBeenCalledWith(expect.objectContaining({
      scope: { scopeType: "channel", scopeId: "general" },
      text: "hello",
      limit: 10,
      offset: 0,
      timeoutMs: 10_000,
      signal: expect.any(AbortSignal)
    }));
    expect(result.current.loading).toBe(false);
  });

  it("surfaces host errors and does not request empty or unscoped searches", async () => {
    const searchRoom = vi.fn().mockRejectedValue(new Error("search unavailable"));
    const live = liveFixture(searchRoom);
    const { result, rerender } = renderHook(({ filters, scopeId }) => useRoomSearch(live, filters, scopeId), {
      initialProps: { filters: { query: "hello", scope: "messages" }, scopeId: "general" }
    });
    await waitFor(() => expect(result.current.error).toBe("search unavailable"));
    rerender({ filters: { query: "  ", scope: "messages" }, scopeId: "general" });
    rerender({ filters: { query: "again", scope: "messages" }, scopeId: undefined });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(searchRoom).toHaveBeenCalledTimes(1);
  });

  it("cancels a superseded request and normalizes non-error failures", async () => {
    let firstResolve!: (value: any) => void;
    let callCount = 0;
    const searchRoom = vi.fn(() => callCount++ === 0
      ? new Promise((resolve) => { firstResolve = resolve; })
      : Promise.resolve({ events: [], matches: [], records: [], total: 0, queryTokenCount: 0 }));
    const live = liveFixture(searchRoom);
    const { result, rerender } = renderHook(({ query }) => useRoomSearch(live, { query, scope: "messages", limit: 0, offset: 0 }, "general"), { initialProps: { query: "first" } });
    await waitFor(() => expect(searchRoom).toHaveBeenCalledTimes(1));
    rerender({ query: "second" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    firstResolve({ events: [], matches: [], records: [], total: 0, queryTokenCount: 0 });
    searchRoom.mockRejectedValueOnce("failure");
    rerender({ query: "third" });
    await waitFor(() => expect(result.current.error).toBe("Encrypted room search failed."));
  });

  it("normalizes a synchronous SDK boundary failure", async () => {
    const searchRoom = vi.fn(() => { throw new Error("search boundary unavailable"); });
    const live = liveFixture(searchRoom);
    const { result } = renderHook(() => useRoomSearch(live, { query: "hello", scope: "messages" }, "general"));
    await waitFor(() => expect(result.current.error).toBe("search boundary unavailable"));
  });

  it("delegates global scopes and filters to the authorized host", async () => {
    const searchRoom = vi.fn().mockResolvedValue({ events: [], matches: [], records: [], total: 0, queryTokenCount: 0 });
    const live = liveFixture(searchRoom);
    const { result, rerender } = renderHook(({ filters }) => useRoomSearch(live, filters, "general"), {
      initialProps: { filters: { query: "hello", scope: "all" as const } }
    });
    await waitFor(() => expect(searchRoom).toHaveBeenCalledTimes(1));
    expect(searchRoom).toHaveBeenCalledWith(expect.objectContaining({ scope: "all", category: "all" }));
    rerender({ filters: { query: "hello", scope: "messages" as const, authorId: "alice", after: 4, before: 8 } });
    await waitFor(() => expect(searchRoom).toHaveBeenCalledTimes(2));
    expect(searchRoom).toHaveBeenLastCalledWith(expect.objectContaining({
      scope: { scopeType: "channel", scopeId: "general" },
      category: "messages",
      authorId: "alice",
      after: 4,
      before: 8
    }));
  });
});
