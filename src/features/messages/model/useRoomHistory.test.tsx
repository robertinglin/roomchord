import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRoomHistory } from "@features/messages/model/useRoomHistory";

describe("useRoomHistory", () => {
  it("loads older records and jumps from the returned cursor", async () => {
    const loadRoomHistory = vi.fn().mockResolvedValue({ records: [{ id: "old", body: "older" }], events: [], total: 1, nextBeforeHlc: "cursor-1" });
    const jumpRoomHistory = vi.fn().mockResolvedValue({ records: [{ id: "jumped", body: "jumped" }], events: [], total: 1 });
    const live = { loadRoomHistory, jumpRoomHistory } as any;
    const { result } = renderHook(() => useRoomHistory(live, "general"));
    act(() => result.current.loadOlder());
    await waitFor(() => expect(result.current.records).toHaveLength(1));
    expect(loadRoomHistory).toHaveBeenCalledWith(expect.objectContaining({
      scope: { scopeType: "channel", scopeId: "general" },
      limit: 50,
      timeoutMs: 10_000,
      signal: expect.any(AbortSignal)
    }));
    expect(result.current.cursor).toBe("cursor-1");
    loadRoomHistory.mockResolvedValueOnce({ records: [], events: [], total: 0 });
    act(() => result.current.loadOlder());
    await waitFor(() => expect(loadRoomHistory).toHaveBeenCalledTimes(2));
    expect(loadRoomHistory.mock.calls[1][0]).toEqual(expect.objectContaining({ beforeHlc: "cursor-1" }));
    act(() => result.current.jumpToCursor("cursor-1"));
    await waitFor(() => expect(result.current.records).toEqual([{ id: "jumped", body: "jumped" }]));
    expect(jumpRoomHistory).toHaveBeenCalledWith(expect.objectContaining({ beforeHlc: "cursor-1" }));
  });

  it("reports history errors and ignores empty or unavailable scopes", async () => {
    const loadRoomHistory = vi.fn().mockRejectedValue(new Error("history unavailable"));
    const live = { loadRoomHistory, jumpRoomHistory: vi.fn() } as any;
    const { result, rerender } = renderHook(({ scopeId }) => useRoomHistory(live, scopeId), { initialProps: { scopeId: "general" } });
    act(() => result.current.loadOlder());
    await waitFor(() => expect(result.current.error).toBe("history unavailable"));
    rerender({ scopeId: undefined });
    act(() => result.current.loadOlder());
    expect(loadRoomHistory).toHaveBeenCalledTimes(1);
  });

  it("ignores blank jump cursors and does not dispatch without a scope", () => {
    const live = { loadRoomHistory: vi.fn(), jumpRoomHistory: vi.fn() } as any;
    const { result } = renderHook(() => useRoomHistory(live));
    act(() => {
      result.current.loadOlder();
      result.current.jumpToCursor("   ");
    });
    expect(live.loadRoomHistory).not.toHaveBeenCalled();
    expect(live.jumpRoomHistory).not.toHaveBeenCalled();
  });

  it("cancels an in-flight request and normalizes non-error failures", async () => {
    let resolveHistory!: (value: any) => void;
    const loadRoomHistory = vi.fn(() => new Promise((resolve) => { resolveHistory = resolve; }));
    const live = { loadRoomHistory, jumpRoomHistory: vi.fn() } as any;
    const { result, unmount } = renderHook(() => useRoomHistory(live, "general"));
    act(() => result.current.loadOlder());
    await waitFor(() => expect(loadRoomHistory).toHaveBeenCalled());
    unmount();
    resolveHistory({ records: [], events: [], total: 0 });
    const failed = { loadRoomHistory: vi.fn().mockRejectedValue("failure"), jumpRoomHistory: vi.fn() } as any;
    const second = renderHook(() => useRoomHistory(failed, "general"));
    act(() => second.result.current.loadOlder());
    await waitFor(() => expect(second.result.current.error).toBe("Encrypted room history failed."));
  });
});
