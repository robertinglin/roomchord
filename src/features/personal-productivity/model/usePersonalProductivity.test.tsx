import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { bookmarkInput, reminderInput, usePersonalProductivity } from "./usePersonalProductivity";

function fixture() {
  const personal = {
    load: vi.fn().mockResolvedValue({}),
    bookmarks: vi.fn().mockResolvedValue([]),
    reminders: vi.fn().mockResolvedValue([]),
    addBookmark: vi.fn().mockResolvedValue(undefined),
    removeBookmark: vi.fn().mockResolvedValue(undefined),
    addReminder: vi.fn().mockResolvedValue(undefined),
    scheduleReminder: vi.fn().mockResolvedValue(undefined),
    markReminderRead: vi.fn().mockResolvedValue(undefined),
    completeReminder: vi.fn().mockResolvedValue(undefined),
    removeReminder: vi.fn().mockResolvedValue(undefined)
  };
  return { live: { personal }, personal };
}

const input = { roomName: "room", scopeType: "channel", scopeId: "general", messageId: "message-1" };

describe("personal productivity", () => {
  it("builds stable room-scoped bookmark and reminder inputs", () => {
    expect(bookmarkInput(input)).toMatchObject({ id: "bookmark:message-1", roomName: "room", scopeId: "general" });
    expect(reminderInput(input, 200)).toMatchObject({ id: "reminder:message-1", dueAt: 200, scopeType: "channel" });
  });

  it("loads, mutates, and refreshes through the public personal controller", async () => {
    const { live, personal } = fixture();
    const { result } = renderHook(() => usePersonalProductivity(live));
    await waitFor(() => expect(personal.bookmarks).toHaveBeenCalled());
    await act(async () => {
      await result.current.addBookmark(bookmarkInput(input));
      await result.current.removeBookmark("bookmark:message-1");
      await result.current.addReminder(reminderInput(input, 200));
      await result.current.scheduleReminder(reminderInput(input, 300));
      await result.current.markReminderRead("reminder:message-1");
      await result.current.completeReminder("reminder:message-1");
      await result.current.removeReminder("reminder:message-1");
    });
    expect(personal.addBookmark).toHaveBeenCalled();
    expect(personal.removeBookmark).toHaveBeenCalledWith("bookmark:message-1");
    expect(personal.addReminder).toHaveBeenCalled();
    expect(personal.scheduleReminder).toHaveBeenCalled();
    expect(personal.markReminderRead).toHaveBeenCalledWith("reminder:message-1");
    expect(personal.completeReminder).toHaveBeenCalledWith("reminder:message-1");
    expect(personal.removeReminder).toHaveBeenCalledWith("reminder:message-1");
    expect(personal.bookmarks.mock.calls.length).toBeGreaterThan(1);
  });

  it("surfaces controller errors without local optimistic records", async () => {
    const { live, personal } = fixture();
    personal.addBookmark.mockRejectedValueOnce(new Error("personal storage unavailable"));
    const { result } = renderHook(() => usePersonalProductivity(live));
    await act(async () => { await result.current.addBookmark(bookmarkInput(input)); });
    expect(result.current.error).toBe("personal storage unavailable");
    expect(result.current.bookmarks).toEqual([]);
  });

  it("normalizes non-Error controller failures", async () => {
    const { live, personal } = fixture();
    personal.bookmarks.mockRejectedValueOnce("personal read failed");
    const { result } = renderHook(() => usePersonalProductivity(live));
    await waitFor(() => expect(result.current.error).toBe("personal read failed"));
  });

  it("keeps an older cross-device refresh from overwriting the latest result", async () => {
    let resolveFirstBookmark!: (value: never[]) => void;
    let resolveFirstReminder!: (value: never[]) => void;
    const firstBookmark = new Promise<never[]>((resolve) => { resolveFirstBookmark = resolve; });
    const firstReminder = new Promise<never[]>((resolve) => { resolveFirstReminder = resolve; });
    const { live, personal } = fixture();
    personal.bookmarks.mockImplementationOnce(() => firstBookmark).mockResolvedValueOnce([{ id: "latest" }]);
    personal.reminders.mockImplementationOnce(() => firstReminder).mockResolvedValueOnce([]);
    const { result } = renderHook(() => usePersonalProductivity(live));
    await act(async () => {
      const latestRefresh = result.current.refresh();
      await latestRefresh;
      resolveFirstBookmark([]);
      resolveFirstReminder([]);
    });
    expect(result.current.bookmarks).toEqual([{ id: "latest" }]);
  });

  it("surfaces non-Error mutation failures without creating records", async () => {
    const { live, personal } = fixture();
    personal.removeBookmark.mockRejectedValueOnce("personal write failed");
    const { result } = renderHook(() => usePersonalProductivity(live));
    await waitFor(() => expect(personal.bookmarks).toHaveBeenCalled());
    await act(async () => { await result.current.removeBookmark("bookmark:message-1"); });
    expect(result.current.error).toBe("personal write failed");
    expect(result.current.bookmarks).toEqual([]);
  });

  it("serializes rapid mutations so a later refresh cannot preserve stale state", async () => {
    let finishBookmarkRemoval!: () => void;
    const bookmarkRemoval = new Promise<void>((resolve) => { finishBookmarkRemoval = resolve; });
    const { live, personal } = fixture();
    personal.removeBookmark.mockImplementationOnce(() => bookmarkRemoval);
    const { result } = renderHook(() => usePersonalProductivity(live));
    await waitFor(() => expect(personal.bookmarks).toHaveBeenCalled());

    let removeBookmarkPromise!: Promise<void>;
    let removeReminderPromise!: Promise<void>;
    await act(async () => {
      removeBookmarkPromise = result.current.removeBookmark("bookmark:message-1");
      removeReminderPromise = result.current.removeReminder("reminder:message-1");
      await Promise.resolve();
    });
    expect(personal.removeReminder).not.toHaveBeenCalled();

    await act(async () => {
      finishBookmarkRemoval();
      await Promise.all([removeBookmarkPromise, removeReminderPromise]);
    });
    expect(personal.removeReminder).toHaveBeenCalledWith("reminder:message-1");
  });
});
