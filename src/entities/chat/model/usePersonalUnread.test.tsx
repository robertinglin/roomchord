import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePersonalUnread } from "@entities/chat/model/usePersonalUnread";

describe("usePersonalUnread", () => {
  it("loads, marks, clears, and receives cross-device marker updates", async () => {
    let listener: ((markers: Record<string, any>) => void) | undefined;
    const getPersonalUnreadMarker = vi.fn().mockResolvedValue(undefined);
    const markPersonalUnread = vi.fn().mockResolvedValue({ messageId: "m-1", createdAt: 5, updatedAt: 6 });
    const clearPersonalUnread = vi.fn().mockResolvedValue(undefined);
    const live = {
      getPersonalUnreadMarker,
      markPersonalUnread,
      clearPersonalUnread,
      subscribePersonalUnread: vi.fn((next: typeof listener) => { listener = next; return () => { listener = undefined; }; })
    } as any;
    const { result, unmount } = renderHook(() => usePersonalUnread(live, "channel:general"));
    await waitFor(() => expect(getPersonalUnreadMarker).toHaveBeenCalledWith("channel:general"));
    act(() => listener?.({ "channel:general": { messageId: "remote", createdAt: 1, updatedAt: 2 } }));
    expect(result.current.marker?.messageId).toBe("remote");
    act(() => result.current.mark("m-1", 5, "General"));
    await waitFor(() => expect(markPersonalUnread).toHaveBeenCalledWith({ topic: "channel:general", messageId: "m-1", createdAt: 5, label: "General" }));
    act(() => result.current.clear());
    await waitFor(() => expect(clearPersonalUnread).toHaveBeenCalledWith("channel:general"));
    unmount();
  });

  it("clears the marker when its topic disappears and never uses local storage", async () => {
    const live = {
      getPersonalUnreadMarker: vi.fn().mockResolvedValue({ messageId: "m", createdAt: 1, updatedAt: 2 }),
      subscribePersonalUnread: vi.fn(() => () => {}),
      markPersonalUnread: vi.fn(),
      clearPersonalUnread: vi.fn()
    } as any;
    const { result, rerender } = renderHook(({ topic }) => usePersonalUnread(live, topic), { initialProps: { topic: "channel:general" as string | undefined } });
    await waitFor(() => expect(result.current.marker?.messageId).toBe("m"));
    rerender({ topic: undefined });
    expect(result.current.marker).toBeUndefined();
    expect(live.markPersonalUnread).not.toHaveBeenCalled();
  });

  it("fails closed when the public marker read rejects and ignores writes without a topic", async () => {
    const live = {
      getPersonalUnreadMarker: vi.fn().mockRejectedValue(new Error("unavailable")),
      subscribePersonalUnread: vi.fn(() => () => {}),
      markPersonalUnread: vi.fn(),
      clearPersonalUnread: vi.fn()
    } as any;
    const { result } = renderHook(() => usePersonalUnread(live, "channel:general"));
    await waitFor(() => expect(result.current.marker).toBeUndefined());
    const noTopic = renderHook(() => usePersonalUnread(live));
    act(() => {
      noTopic.result.current.mark("m", 1);
      noTopic.result.current.clear();
    });
    expect(live.markPersonalUnread).not.toHaveBeenCalled();
    expect(live.clearPersonalUnread).not.toHaveBeenCalled();
  });

  it("does not publish a marker after unmount and supports labels omitted", async () => {
    let resolveMarker!: (value: undefined) => void;
    const live = {
      getPersonalUnreadMarker: vi.fn(() => new Promise<undefined>((resolve) => { resolveMarker = resolve; })),
      subscribePersonalUnread: vi.fn(() => () => {}),
      markPersonalUnread: vi.fn().mockResolvedValue({ messageId: "m", createdAt: 1, updatedAt: 2 }),
      clearPersonalUnread: vi.fn().mockResolvedValue(undefined)
    } as any;
    const { result, unmount } = renderHook(() => usePersonalUnread(live, "channel:general"));
    await waitFor(() => expect(live.getPersonalUnreadMarker).toHaveBeenCalled());
    unmount();
    resolveMarker(undefined);
    const active = renderHook(() => usePersonalUnread(live, "channel:general"));
    act(() => active.result.current.mark("m", 1));
    await waitFor(() => expect(live.markPersonalUnread).toHaveBeenCalledWith({ topic: "channel:general", messageId: "m", createdAt: 1 }));
  });

  it("fails closed when subscription or marker writes throw synchronously", async () => {
    const live = {
      getPersonalUnreadMarker: vi.fn(() => { throw new Error("read unavailable"); }),
      subscribePersonalUnread: vi.fn(() => { throw new Error("subscribe unavailable"); }),
      markPersonalUnread: vi.fn(() => { throw new Error("mark unavailable"); }),
      clearPersonalUnread: vi.fn(() => { throw new Error("clear unavailable"); })
    } as any;
    const { result } = renderHook(() => usePersonalUnread(live, "channel:general"));
    await waitFor(() => expect(result.current.marker).toBeUndefined());
    act(() => {
      result.current.mark("message", 1);
      result.current.clear();
    });
    await waitFor(() => expect(live.markPersonalUnread).toHaveBeenCalled());
    expect(live.markPersonalUnread).toHaveBeenCalled();
    expect(live.clearPersonalUnread).toHaveBeenCalled();
  });
});
