import { act, renderHook, waitFor } from "@testing-library/react";
import { createMatterhornNotificationPreferencesClient } from "matterhorn-sdk/browser";
import { describe, expect, it, vi } from "vitest";
import { useNotificationPreferences } from "./useNotificationPreferences";

describe("useNotificationPreferences", () => {
  it("loads personal state and keeps mode, mute, and follow changes independent", async () => {
    const client = createMatterhornNotificationPreferencesClient({ ownerId: "member-1", now: () => 100 });
    const live = { notificationPreferences: client } as never;
    const { result } = renderHook(() => useNotificationPreferences(live));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const scope = { type: "channel" as const, roomId: "room-1", channelId: "general" };

    await act(async () => {
      await result.current.setMode(scope, "mentions");
      await result.current.setMute(scope, { kind: "indefinite" });
      await result.current.setMute({ type: "channel", roomId: "room-1", channelId: "random" }, { kind: "indefinite" });
      await result.current.setFollowed("thread-1", true);
    });

    expect(result.current.preference(scope)).toMatchObject({ mode: "mentions", mute: { kind: "indefinite" } });
    expect(result.current.resolve(scope).muted).toBe(true);
    expect(result.current.resolve(scope, "work").mode).toBe("mentions");
    expect(result.current.followed("thread-1")).toBe(true);

    await act(async () => {
      await result.current.setMute(scope, null);
      await result.current.setFollowed("thread-1", false);
    });
    expect(result.current.preference(scope)).toMatchObject({ mode: "mentions", mute: null });
    expect(result.current.followed("thread-1")).toBe(false);
  });

  it("reports launcher load failures", async () => {
    const client = {
      load: vi.fn().mockRejectedValue(new Error("Encrypted personal state is unavailable.")),
      subscribe: vi.fn(() => vi.fn())
    };
    const { result } = renderHook(() => useNotificationPreferences({ notificationPreferences: client } as never));
    await waitFor(() => expect(result.current.error).toBe("Encrypted personal state is unavailable."));
    expect(result.current.ready).toBe(false);
  });

  it("uses a stable fallback message for non-error load failures", async () => {
    const client = {
      load: vi.fn().mockRejectedValue("offline"),
      subscribe: vi.fn(() => vi.fn())
    };
    const { result } = renderHook(() => useNotificationPreferences({ notificationPreferences: client } as never));
    await waitFor(() => expect(result.current.error).toBe("Notification preferences are unavailable."));
  });
});
